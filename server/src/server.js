import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { db, getSetting, setSetting, USING_PG } from './db.js';
import { buildDashboard, kocSessions } from './aggregate.js';
import { computeKocStats, applyScores } from './scoring.js';
import { ingest, deleteDataset } from './ingest.js';
import { ensureDefaults } from './defaults.js';
import { findUser, verifyPassword, signToken, requireAuth, requireAdmin, requireRole, ensureAdmin, createUser, updatePassword, ROLES } from './auth.js';
import { logAction, recentAudit } from './audit.js';
import { readFileSync, existsSync as fileExists } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const WEB_DIST = join(__dirname, '..', '..', 'web', 'dist');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// Bootstrap on first boot: defaults, admin, and seed from the bundled sample
// file if the DB is empty (so a fresh container / volume just works).
await ensureDefaults(db);
await ensureAdmin(db);
{
  const { n } = await db.get('SELECT COUNT(*) n FROM sessions');
  const sample = join(__dirname, '..', '..', 'project', 'uploads', 'Live Analysis20260416084057 (1).xlsx');
  if (n === 0 && fileExists(sample)) {
    console.log('[livescope] empty DB — seeding from bundled sample…');
    try {
      const r = await ingest(db, readFileSync(sample), { brandName: 'Macaron Cos', fileName: 'Live Analysis20260416084057 (1).xlsx', reset: true });
      console.log(`[livescope] seeded ${r.count} sessions`);
    } catch (e) { console.error('[livescope] auto-seed failed:', e.message); }
  }
}

// --- dashboard cache (keyed by from+to so date filters get their own cache) ---
const cacheMap = new Map();
const cacheKey = (from, to) => `${from || ''}|${to || ''}`;
const dashboard = async (from, to) => {
  const k = cacheKey(from, to);
  if (!cacheMap.has(k)) cacheMap.set(k, await buildDashboard(db, { from, to }));
  return cacheMap.get(k);
};
const invalidate = () => { cacheMap.clear(); };

/* ------------------------------- auth ----------------------------------- */
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  const u = await findUser(db, username);
  if (!u || !verifyPassword(password, u.pass_salt, u.pass_hash)) {
    return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
  }
  const user = { id: u.id, username: u.username, name: u.name, role: u.role };
  await logAction(db, { uid: u.id, username: u.username }, 'login', 'Đăng nhập');
  res.json({ token: signToken({ uid: u.id, username: u.username, role: u.role }), user });
});

// Change own password (any authenticated user).
app.post('/api/auth/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Cần mật khẩu hiện tại & mới' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' });
  const u = await db.get('SELECT * FROM users WHERE id = ?', [req.user.uid]);
  if (!u || !verifyPassword(currentPassword, u.pass_salt, u.pass_hash)) {
    return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
  }
  await updatePassword(db, u.id, newPassword);
  await logAction(db, req.user, 'change_password', 'Tự đổi mật khẩu');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const u = await db.get('SELECT id, username, name, role FROM users WHERE id = ?', [req.user.uid]);
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  res.json({ user: u });
});

/* ------------------------------- public --------------------------------- */
app.get('/api/health', async (_req, res) => {
  const t = await db.get('SELECT COUNT(*) n FROM sessions');
  res.json({ ok: true, sessions: t.n, db: db.dialect });
});

/* --------------------------- protected API ------------------------------ */
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const from = req.query.from || null;
    const to   = req.query.to   || null;
    // Basic date validation
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (from && !dateRe.test(from)) return res.status(400).json({ error: 'from must be YYYY-MM-DD' });
    if (to   && !dateRe.test(to))   return res.status(400).json({ error: 'to must be YYYY-MM-DD' });
    res.json(await dashboard(from, to));
  }
  catch (e) { console.error(e); res.status(500).json({ error: String(e) }); }
});

app.get('/api/kocs/:id/sessions', requireAuth, async (req, res) => {
  res.json(await kocSessions(db, req.params.id, Math.min(50, +req.query.limit || 12)));
});

app.get('/api/settings', requireAuth, async (_req, res) => {
  res.json({ weights: await getSetting('weights', []), thresholds: await getSetting('thresholds', []) });
});

app.put('/api/settings/weights', requireAuth, requireAdmin, async (req, res) => {
  const incoming = req.body?.weights;
  if (!Array.isArray(incoming)) return res.status(400).json({ error: 'weights[] required' });
  await setSetting('weights', incoming);
  const w = Object.fromEntries(incoming.map((x) => [x.key, x.v]));
  await applyScores(db, await computeKocStats(db), w);
  invalidate();
  await logAction(db, req.user, 'update_weights', 'Cập nhật trọng số chấm điểm');
  res.json({ ok: true, weights: incoming });
});

// Add / edit / remove alert thresholds (admin).
app.put('/api/settings/thresholds', requireAuth, requireAdmin, async (req, res) => {
  const incoming = req.body?.thresholds;
  if (!Array.isArray(incoming)) return res.status(400).json({ error: 'thresholds[] required' });
  const clean = incoming
    .filter((t) => t && (t.l || '').trim())
    .map((t) => ({
      l: String(t.l).trim(),
      d: String(t.d || '').trim(),
      v: String(t.v || '').trim(),
      c: ['#E2502F', '#BE8A14', '#2E9C46', '#F47B27', '#9C8F75'].includes(t.c) ? t.c : '#BE8A14'
    }));
  await setSetting('thresholds', clean);
  invalidate();
  await logAction(db, req.user, 'update_thresholds', `Cập nhật ngưỡng cảnh báo (${clean.length} mục)`);
  res.json({ ok: true, thresholds: clean });
});

// Real .xlsx upload -> ingest into a brand -> re-score. (admin or leader)
app.post('/api/datasets/upload', requireAuth, requireRole('admin', 'leader'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Thiếu file' });
    const brandName = (req.body?.brand || 'Macaron Cos').trim() || 'Macaron Cos';
    const result = await ingest(db, req.file.buffer, { brandName, fileName: req.file.originalname, reset: false });
    invalidate();
    await logAction(db, req.user, 'upload', `Tải lên ${req.file.originalname} → "${brandName}" (${result.count} phiên)`);
    res.json({ ok: true, brand: brandName, ...result });
  } catch (e) {
    console.error('[upload]', e.message);
    res.status(400).json({ error: e.message });
  }
});

// Delete an uploaded dataset (admin only).
app.delete('/api/datasets/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = +req.params.id;
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id không hợp lệ' });
    const ds = await db.get('SELECT label FROM datasets WHERE id = ?', [id]);
    const result = await deleteDataset(db, id);
    invalidate();
    await logAction(db, req.user, 'delete_dataset', `Xoá "${ds?.label || id}" (${result.removed} phiên)`);
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[delete dataset]', e.message);
    res.status(400).json({ error: e.message });
  }
});

/* --------------------------- brand management --------------------------- */

// List all brands with session & koc counts.
app.get('/api/brands', requireAuth, async (_req, res) => {
  try {
    const brands = await db.all(`
      SELECT b.id, b.name, b.plan,
             COUNT(DISTINCT s.id)      AS sessions,
             COUNT(DISTINCT s.koc_id)  AS kocs,
             MIN(s.day)                AS date_from,
             MAX(s.day)                AS date_to
      FROM brands b
      LEFT JOIN sessions s ON s.brand_id = b.id
      GROUP BY b.id, b.name, b.plan
      ORDER BY b.id
    `);
    res.json({ brands });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Create a new brand (admin).
app.post('/api/brands', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, plan } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Tên brand không được để trống' });
    const trimmed = name.trim();
    const existing = await db.get('SELECT id FROM brands WHERE name = ?', [trimmed]);
    if (existing) return res.status(409).json({ error: 'Brand đã tồn tại' });
    const validPlans = ['Starter', 'Growth', 'Pro', 'Enterprise'];
    const cleanPlan = validPlans.includes(plan) ? plan : 'Growth';
    await db.run('INSERT INTO brands (name, plan) VALUES (?, ?)', [trimmed, cleanPlan]);
    const brand = await db.get('SELECT * FROM brands WHERE name = ?', [trimmed]);
    await logAction(db, req.user, 'create_brand', `Tạo brand "${trimmed}" (${cleanPlan})`);
    invalidate();
    res.json({ ok: true, brand });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Update a brand's name or plan (admin).
app.put('/api/brands/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = +req.params.id;
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id không hợp lệ' });
    const { name, plan } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Tên brand không được để trống' });
    const trimmed = name.trim();
    const current = await db.get('SELECT * FROM brands WHERE id = ?', [id]);
    if (!current) return res.status(404).json({ error: 'Không tìm thấy brand' });
    // Check name collision (exclude self)
    const collision = await db.get('SELECT id FROM brands WHERE name = ? AND id != ?', [trimmed, id]);
    if (collision) return res.status(409).json({ error: 'Tên brand đã được dùng' });
    const validPlans = ['Starter', 'Growth', 'Pro', 'Enterprise'];
    const cleanPlan = validPlans.includes(plan) ? plan : current.plan;
    await db.run('UPDATE brands SET name = ?, plan = ? WHERE id = ?', [trimmed, cleanPlan, id]);
    await logAction(db, req.user, 'update_brand', `Sửa brand #${id}: "${current.name}" → "${trimmed}" (${cleanPlan})`);
    invalidate();
    res.json({ ok: true, brand: { id, name: trimmed, plan: cleanPlan } });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Delete a brand (admin). Blocked if brand has sessions or datasets.
app.delete('/api/brands/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = +req.params.id;
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id không hợp lệ' });
    const brand = await db.get('SELECT * FROM brands WHERE id = ?', [id]);
    if (!brand) return res.status(404).json({ error: 'Không tìm thấy brand' });
    // Guard: cannot delete if sessions exist
    const { n: sessionCount } = await db.get('SELECT COUNT(*) n FROM sessions WHERE brand_id = ?', [id]);
    if (sessionCount > 0) {
      return res.status(400).json({
        error: `Không thể xoá brand "${brand.name}" — còn ${sessionCount.toLocaleString('vi-VN')} phiên live liên kết. Hãy xoá dữ liệu trước.`
      });
    }
    await db.run('DELETE FROM brands WHERE id = ?', [id]);
    await logAction(db, req.user, 'delete_brand', `Xoá brand "${brand.name}"`);
    invalidate();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/* --------------------------- user management ---------------------------- */
app.get('/api/users', requireAuth, requireAdmin, async (_req, res) => {
  res.json({ users: await db.all('SELECT id, username, name, role, created_at FROM users ORDER BY id') });
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, name, role, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Cần tài khoản & mật khẩu' });
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Vai trò không hợp lệ' });
  if (await findUser(db, username.trim())) return res.status(409).json({ error: 'Tài khoản đã tồn tại' });
  const user = await createUser(db, { username: username.trim(), name, role, password });
  await logAction(db, req.user, 'create_user', `Tạo user @${user.username} (${user.role})`);
  res.json({ ok: true, user });
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = +req.params.id;
  if (id === req.user.uid) return res.status(400).json({ error: 'Không thể xoá chính mình' });
  const u = await db.get('SELECT username, role FROM users WHERE id = ?', [id]);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy user' });
  if (u.role === 'admin') {
    const admins = await db.get("SELECT COUNT(*) n FROM users WHERE role = 'admin'");
    if (admins.n <= 1) return res.status(400).json({ error: 'Phải còn ít nhất 1 admin' });
  }
  await db.run('DELETE FROM users WHERE id = ?', [id]);
  await logAction(db, req.user, 'delete_user', `Xoá user @${u.username}`);
  res.json({ ok: true });
});

// Admin change an existing user's role (leader <-> viewer <-> admin).
app.put('/api/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  const id = +req.params.id;
  const { role } = req.body || {};
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Vai trò không hợp lệ' });
  const u = await db.get('SELECT username, role FROM users WHERE id = ?', [id]);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy user' });
  if (u.role === 'admin' && role !== 'admin') {
    const admins = await db.get("SELECT COUNT(*) n FROM users WHERE role = 'admin'");
    if (admins.n <= 1) return res.status(400).json({ error: 'Phải còn ít nhất 1 admin' });
  }
  if (u.role !== role) {
    await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    await logAction(db, req.user, 'update_role', `Đổi vai trò @${u.username}: ${u.role} → ${role}`);
  }
  res.json({ ok: true, role });
});

// Admin reset another user's password.
app.put('/api/users/:id/password', requireAuth, requireAdmin, async (req, res) => {
  const id = +req.params.id;
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
  const u = await db.get('SELECT username FROM users WHERE id = ?', [id]);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy user' });
  await updatePassword(db, id, newPassword);
  await logAction(db, req.user, 'reset_password', `Đặt lại mật khẩu cho @${u.username}`);
  res.json({ ok: true });
});

// Audit log (admin).
app.get('/api/audit', requireAuth, requireAdmin, async (req, res) => {
  res.json({ entries: await recentAudit(db, Math.min(500, +req.query.limit || 200)) });
});

/* --------------------------- static frontend ---------------------------- */
if (existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(join(WEB_DIST, 'index.html'));
  });
} else {
  app.get('/', (_req, res) =>
    res.type('text').send('LiveScope API running. Build the frontend (cd web && npm run build) to serve the UI.'));
}

app.listen(PORT, () => console.log(`[livescope] API + UI on http://localhost:${PORT} · db=${db.dialect}`));
