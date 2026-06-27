// Simple, dependency-free auth: scrypt password hashing + HMAC-signed bearer
// tokens (both from node:crypto). Good enough for a small internal tool; set
// AUTH_SECRET in production.
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

const SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
const TOKEN_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

if (!process.env.AUTH_SECRET) {
  console.warn('[auth] AUTH_SECRET not set — using an insecure dev secret. Set AUTH_SECRET in production.');
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const a = scryptSync(password, salt, 64);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signToken(payload) {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL }));
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}

export async function findUser(db, username) {
  return db.get('SELECT * FROM users WHERE username = ?', [username]);
}

export async function updatePassword(db, userId, newPassword) {
  const { salt, hash } = hashPassword(newPassword);
  await db.run('UPDATE users SET pass_salt = ?, pass_hash = ? WHERE id = ?', [salt, hash, userId]);
}

export const ROLES = ['admin', 'leader', 'viewer'];

export async function createUser(db, { username, name, role = 'viewer', password }) {
  const r = ROLES.includes(role) ? role : 'viewer';
  const { salt, hash } = hashPassword(password);
  await db.run(
    'INSERT INTO users(username,name,role,pass_salt,pass_hash,created_at) VALUES(?,?,?,?,?,?)',
    [username, name || username, r, salt, hash, new Date().toISOString()]
  );
  return db.get('SELECT id, username, name, role FROM users WHERE username = ?', [username]);
}

// Create a default admin if the users table is empty.
export async function ensureAdmin(db) {
  const c = await db.get('SELECT COUNT(*) n FROM users');
  if (c.n > 0) return null;
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const u = await createUser(db, { username: 'admin', name: 'Quản trị', role: 'admin', password });
  console.log(`[auth] created default admin — username: admin · password: ${password}${process.env.ADMIN_PASSWORD ? '' : ' (default; set ADMIN_PASSWORD)'}`);
  return u;
}

// Express middleware.
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : (req.query.token || '');
  const data = verifyToken(token);
  if (!data) return res.status(401).json({ error: 'unauthorized' });
  req.user = data;
  next();
}

// Role gate: pass if the user's role is in the allowed list.
export function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'forbidden' });
}

export const requireAdmin = requireRole('admin');
