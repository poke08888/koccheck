// Read-side aggregations that feed the dashboard. Everything is derived from the
// `sessions` grain + the `koc_stats` cache, so numbers always reconcile.
// All queries are dialect-safe: camelCase JSON keys come from quoted aliases so
// SQLite and Postgres return identical shapes.
import { getSetting } from './db.js';
import { gradeColor } from './scoring.js';
import { buildAlerts } from './alerts.js';
import { SAMPLE_PRODUCTS } from './products.js';

const M = 1e6;

// Build WHERE clause + params for optional date range filter.
// Returns { where: ' WHERE ...', params: [...] }
function dateFilter(from, to) {
  if (from && to) return { where: ' WHERE day BETWEEN ? AND ?', params: [from, to] };
  if (from)       return { where: ' WHERE day >= ?',           params: [from] };
  if (to)         return { where: ' WHERE day <= ?',           params: [to] };
  return { where: '', params: [] };
}

// Append extra AND conditions to an existing WHERE clause.
function andFilter(base, extra) {
  if (!extra) return base;
  return base.where
    ? { where: base.where + ' AND ' + extra, params: base.params }
    : { where: ' WHERE ' + extra, params: base.params };
}

export async function totals(db, { from, to } = {}) {
  const f = dateFilter(from, to);
  const t = await db.get(`
    SELECT
      COALESCE(SUM(gmv),0)            AS gmv,
      COALESCE(SUM(gmv_live),0)       AS "gmvLive",
      COALESCE(SUM(orders),0)         AS orders,
      COALESCE(SUM(orders_live),0)    AS "ordersLive",
      COUNT(*)                        AS sessions,
      COALESCE(SUM(viewers),0)        AS viewers,
      COALESCE(SUM(views),0)          AS views,
      COALESCE(SUM(impressions),0)    AS impr,
      COALESCE(SUM(clicks),0)         AS clicks,
      COALESCE(SUM(duration_min),0)/60.0 AS hours,
      COUNT(CASE WHEN orders > 0 THEN 1 END) AS "withOrder",
      COALESCE(SUM(shares),0)         AS shares,
      COALESCE(SUM(likes),0)          AS likes,
      COALESCE(SUM(comments),0)       AS comments,
      COALESCE(SUM(new_followers),0)  AS newfol,
      COALESCE(SUM(distinct_sold),0)  AS "distinctSold",
      COALESCE(SUM(products_added),0) AS "prodAdded",
      COALESCE(SUM(watch_avg_sec*viewers),0) AS "watchW"
    FROM sessions${f.where}
  `, f.params);
  t.kocActive = (await db.get(`SELECT COUNT(DISTINCT koc_id) n FROM sessions${f.where}`, f.params)).n;
  t.watchAvg = t.viewers > 0 ? +(t.watchW / t.viewers).toFixed(1) : 0;
  delete t.watchW;
  return t;
}

// Per-day series with Top1-2 / Top3-5 / rest GMV attribution (in millions VND).
export async function dailySeries(db, { from, to } = {}) {
  const f = dateFilter(from, to);
  // Combine: always filter day IS NOT NULL; optionally also filter by from/to
  const whereClause = f.where
    ? f.where + ' AND day IS NOT NULL'
    : ' WHERE day IS NOT NULL';
  const days = await db.all(`
    SELECT day AS d,
           COALESCE(SUM(gmv),0)   AS gmv,
           COALESCE(SUM(orders),0) AS orders,
           COUNT(*)               AS sessions,
           COUNT(DISTINCT koc_id) AS nkoc
    FROM sessions${whereClause}
    GROUP BY day ORDER BY day
  `, f.params);

  const out = [];
  for (const d of days) {
    const ranked = await db.all(
      'SELECT koc_id, COALESCE(SUM(gmv),0) g FROM sessions WHERE day = ? GROUP BY koc_id ORDER BY g DESC',
      [d.d]
    );
    const sum = (a, b) => ranked.slice(a, b).reduce((s, r) => s + r.g, 0);
    out.push({
      d: d.d.slice(5),
      gmv: Math.round(d.gmv / M), orders: d.orders, sessions: d.sessions, nkoc: d.nkoc,
      t12: Math.round(sum(0, 2) / M), t35: Math.round(sum(2, 5) / M), rest: Math.round(sum(5) / M)
    });
  }
  return out;
}

// 24-hour distribution: w = sessions that produced an order, n = the rest.
export async function hourSeries(db, { from, to } = {}) {
  const f = dateFilter(from, to);
  const baseWhere = f.where
    ? f.where + ' AND hour IS NOT NULL'
    : ' WHERE hour IS NOT NULL';
  const rows = await db.all(`
    SELECT hour AS h,
           COUNT(CASE WHEN orders > 0 THEN 1 END) AS w,
           COUNT(CASE WHEN orders = 0 THEN 1 END) AS n
    FROM sessions${baseWhere} GROUP BY hour
  `, f.params);
  const byHour = Object.fromEntries(rows.map((r) => [r.h, r]));
  return Array.from({ length: 24 }, (_, h) => ({ h, w: byHour[h]?.w || 0, n: byHour[h]?.n || 0 }));
}

export async function kocList(db, { from, to } = {}) {
  if (from || to) {
    // When date-filtered: aggregate directly from sessions, not the pre-computed koc_stats cache.
    const f = dateFilter(from, to);
    return db.all(`
      SELECT k.id, k.name, k.username AS "user",
             COUNT(s.id)                          AS sessions,
             COALESCE(SUM(s.gmv),0)               AS gmv,
             COALESCE(SUM(s.gmv_live),0)          AS "gmvLive",
             COALESCE(SUM(s.orders),0)             AS orders,
             COALESCE(SUM(s.orders_live),0)        AS "ordersLive",
             COALESCE(SUM(s.duration_min),0)/60.0  AS hours,
             COALESCE(SUM(s.viewers),0)            AS viewers,
             COALESCE(SUM(s.views),0)              AS views,
             COALESCE(SUM(s.impressions),0)        AS impr,
             COALESCE(SUM(s.clicks),0)             AS clicks,
             COALESCE(SUM(s.comments),0)           AS comments,
             COALESCE(SUM(s.shares),0)             AS shares,
             COALESCE(SUM(s.likes),0)              AS likes,
             COALESCE(SUM(s.new_followers),0)      AS newfol,
             COALESCE(SUM(s.customers),0)          AS customers,
             COALESCE(SUM(s.distinct_sold),0)      AS "distinctSold",
             CASE WHEN SUM(s.viewers) > 0 THEN COALESCE(SUM(s.watch_avg_sec*s.viewers),0)/SUM(s.viewers) ELSE 0 END AS "watchAvg",
             CASE WHEN SUM(s.impressions) > 0 THEN CAST(SUM(s.clicks) AS REAL)/SUM(s.impressions)*100 ELSE 0 END AS ctr,
             CASE WHEN SUM(s.clicks) > 0 THEN CAST(SUM(s.orders) AS REAL)/SUM(s.clicks)*100 ELSE 0 END AS cvr,
             CASE WHEN COUNT(s.id) > 0 THEN COALESCE(SUM(s.duration_min),0)/60.0/COUNT(s.id) ELSE 0 END AS dtgio,
             CASE WHEN SUM(s.orders) > 0 THEN COALESCE(SUM(s.gmv),0)/SUM(s.orders) ELSE 0 END AS aov,
             st.score, st.grade,
             st.comp_dtgio, st.comp_cvr, st.comp_ctr, st.comp_gmv, st.comp_reg
      FROM sessions s
      JOIN kocs k ON k.id = s.koc_id
      LEFT JOIN koc_stats st ON st.koc_id = s.koc_id
      ${f.where}
      GROUP BY k.id, k.name, k.username, st.score, st.grade, st.comp_dtgio, st.comp_cvr, st.comp_ctr, st.comp_gmv, st.comp_reg
      ORDER BY gmv DESC
    `, f.params);
  }
  return db.all(`
    SELECT k.id, k.name, k.username AS "user",
           s.sessions, s.gmv, s.gmv_live AS "gmvLive", s.orders, s.orders_live AS "ordersLive",
           s.hours, s.viewers, s.views, s.impr, s.clicks, s.comments, s.shares, s.likes,
           s.newfol, s.customers, s.distinct_sold AS "distinctSold", s.watch_avg AS "watchAvg",
           s.ctr, s.cvr, s.dtgio, s.aov, s.score, s.grade,
           s.comp_dtgio, s.comp_cvr, s.comp_ctr, s.comp_gmv, s.comp_reg
    FROM koc_stats s JOIN kocs k ON k.id = s.koc_id
    ORDER BY s.gmv DESC
  `);
}

export async function gradeCounts(db, { from, to } = {}) {
  if (from || to) {
    // Recompute grades on filtered koc list (use the cached grade per koc, just filter which kocs appear)
    const f = dateFilter(from, to);
    const rows = await db.all(`
      SELECT st.grade, COUNT(DISTINCT s.koc_id) n
      FROM sessions s
      JOIN koc_stats st ON st.koc_id = s.koc_id
      ${f.where}
      GROUP BY st.grade
    `, f.params);
    const g = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    rows.forEach((r) => { if (r.grade) g[r.grade] = r.n; });
    return g;
  }
  const rows = await db.all('SELECT grade, COUNT(*) n FROM koc_stats GROUP BY grade');
  const g = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  rows.forEach((r) => { g[r.grade] = r.n; });
  return g;
}

// Recent real sessions for one KOC (used by the detail screen).
export async function kocSessions(db, kocId, limit = 12) {
  const rows = await db.all(`
    SELECT day, start_hm, duration_min, gmv, orders, viewers, impressions, clicks, ctr
    FROM sessions WHERE koc_id = ? ORDER BY started_at DESC LIMIT ?
  `, [kocId, limit]);
  return rows.map((r) => ({
    date: r.day, start: r.start_hm, durMin: r.duration_min,
    gmv: r.gmv, orders: r.orders, viewers: r.viewers,
    impr: r.impressions, clicks: r.clicks, ctr: r.ctr
  }));
}

export async function sessionsSample(db, { from, to } = {}, limit = 12) {
  const f = dateFilter(from, to);
  const rows = await db.all(`
    SELECT day, start_hm, duration_min, gmv, orders, viewers, impressions, clicks, ctr
    FROM sessions${f.where} ORDER BY started_at DESC LIMIT ?
  `, [...f.params, limit]);
  return rows.map((r) => ({
    date: r.day, start: r.start_hm, durMin: r.duration_min,
    gmv: r.gmv, orders: r.orders, viewers: r.viewers,
    impr: r.impressions, clicks: r.clicks,
    ctr: (r.ctr || 0).toFixed(2).replace('.', ',') + '%'
  }));
}

export async function meta(db) {
  const ds = await db.all('SELECT * FROM datasets ORDER BY id DESC');
  const brands = await db.all('SELECT id, name, plan FROM brands ORDER BY id');
  const range = await db.get('SELECT MIN(day) a, MAX(day) b FROM sessions');
  return { brands, datasets: ds, dateFrom: range?.a, dateTo: range?.b };
}

// One bundle that mirrors the prototype's KOCDATA object so the SPA can render
// every screen from a single fetch.
export async function buildDashboard(db, { from, to } = {}) {
  const filter = { from, to };
  const total = await totals(db, filter);
  const koc = await kocList(db, filter);
  const grades = await gradeCounts(db, filter);
  const days = await dailySeries(db, filter);
  const hours = await hourSeries(db, filter);
  return {
    meta: await meta(db),
    total, days, hours, koc, grades,
    sessionsSample: await sessionsSample(db, filter),
    alerts: buildAlerts(db, { total, koc, days, hours, grades }),
    products: SAMPLE_PRODUCTS,
    weights: await getSetting('weights', []),
    thresholds: await getSetting('thresholds', []),
    insights: buildInsights({ total, koc, days, hours })
  };
}

// Auto-insight cards on the Overview header.
function buildInsights({ total, koc, days, hours }) {
  const top = koc[0] || {};
  const topShare = total.gmv ? (top.gmv / total.gmv) * 100 : 0;
  const zeroSessions = total.sessions - total.withOrder;
  const zeroPct = total.sessions ? (zeroSessions / total.sessions) * 100 : 0;
  const golden = [...hours]
    .map((h) => ({ h: h.h, rate: h.w / Math.max(1, h.w + h.n) }))
    .sort((a, b) => b.rate - a.rate).slice(0, 2)
    .map((x) => (x.h < 10 ? '0' + x.h : x.h) + 'h');
  const peak = [...days].sort((a, b) => b.gmv - a.gmv)[0] || { d: '', gmv: 0 };
  const peakPct = total.gmv ? (peak.gmv * 1e6 / total.gmv) * 100 : 0;
  const fmt1 = (n) => n.toFixed(1).replace('.', ',');

  return [
    { tag: 'Rủi ro tập trung', icon: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
      g1: '#FBF0DA', g2: '#FFFFFF', bd: '#E6D2A4', ic: '#F6E5C2', icc: '#BE8A14',
      text: `${top.name || '—'} chiếm ${fmt1(topShare)}% GMV toàn kỳ — nên mở rộng nhóm KOC chủ lực.` },
    { tag: 'Cơ hội lớn', icon: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
      g1: '#EEF3DF', g2: '#FFFFFF', bd: '#E0D1AE', ic: '#EEF3DF', icc: '#BE8A14',
      text: `${zeroSessions.toLocaleString('vi-VN')} phiên (${fmt1(zeroPct)}%) chưa phát sinh đơn — kho dư địa tối ưu kịch bản & sản phẩm.` },
    { tag: 'Khung giờ vàng', icon: 'M12 6v6l4 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
      g1: '#FAF2E4', g2: '#FFFFFF', bd: '#E0D1AE', ic: '#F4ECDB', icc: '#F47B27',
      text: `${golden[0] || '--'} và ${golden[1] || '--'} cho tỷ lệ ra đơn cao nhất — ưu tiên xếp lịch KOC mạnh vào 2 khung này.` },
    { tag: 'Đỉnh chiến dịch', icon: 'M3 3v18h18 M7 14l3-4 4 3 4-7',
      g1: '#EEF3DF', g2: '#FFFFFF', bd: '#D4E2B8', ic: '#E6F0D6', icc: '#2E9C46',
      text: `${peak.d} đạt ${peak.gmv >= 1000 ? fmt1(peak.gmv / 1000) + ' tỷ' : peak.gmv + ' tr'} GMV (${fmt1(peakPct)}% cả kỳ) — rà soát yếu tố tạo đỉnh để lặp lại.` }
  ];
}

export { gradeColor };
