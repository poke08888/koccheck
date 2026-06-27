// KOC scoring model.
//
// Five normalised axes (0..100), combined with editable weights into a 0..100
// score, then bucketed into grades S/A/B/C/D. This reproduces the model used in
// the design prototype (verified: Tun Phạm -> 81/S, Hứa Ngân -> 73/A).
//
//   Hiệu suất giờ : min(100, dtgio / (maxDtgio*0.5) * 100)
//   Chuyển đổi    : min(100, cvr / 8 * 100)
//   Thu hút       : min(100, ctr / 5 * 100)
//   Quy mô        : min(100, log10(gmv+1) / log10(maxGmv+1) * 100)
//   Đều đặn       : min(100, sessions / 30 * 100)

export const DEFAULT_WEIGHTS = { dtgio: 30, cvr: 25, ctr: 20, gmv: 15, reg: 10 };

export function gradeColor(g) {
  return { S: '#F47B27', A: '#BE8A14', B: '#2E9C46', C: '#C2801A', D: '#9C8F75' }[g] || '#9C8F75';
}

export function gradeFor(score) {
  if (score >= 75) return 'S';
  if (score >= 65) return 'A';
  if (score >= 50) return 'B';
  if (score >= 33) return 'C';
  return 'D';
}

// Aggregate sessions -> one stats row per KOC (raw, pre-score).
export async function computeKocStats(db) {
  const rows = await db.all(`
    SELECT
      k.id, k.name, k.username,
      COUNT(s.id)                         AS sessions,
      COALESCE(SUM(s.gmv),0)              AS gmv,
      COALESCE(SUM(s.gmv_live),0)         AS "gmvLive",
      COALESCE(SUM(s.orders),0)           AS orders,
      COALESCE(SUM(s.orders_live),0)      AS "ordersLive",
      COALESCE(SUM(s.duration_min),0)/60.0 AS hours,
      COALESCE(SUM(s.viewers),0)          AS viewers,
      COALESCE(SUM(s.views),0)            AS views,
      COALESCE(SUM(s.impressions),0)      AS impr,
      COALESCE(SUM(s.clicks),0)           AS clicks,
      COALESCE(SUM(s.comments),0)         AS comments,
      COALESCE(SUM(s.shares),0)           AS shares,
      COALESCE(SUM(s.likes),0)            AS likes,
      COALESCE(SUM(s.new_followers),0)    AS newfol,
      COALESCE(SUM(s.customers),0)        AS customers,
      COALESCE(SUM(s.distinct_sold),0)    AS "distinctSold",
      COALESCE(SUM(s.watch_avg_sec * s.viewers),0) AS "watchW",
      COUNT(CASE WHEN s.orders > 0 THEN 1 END) AS "withOrder"
    FROM kocs k
    LEFT JOIN sessions s ON s.koc_id = k.id
    GROUP BY k.id, k.name, k.username
  `);

  for (const k of rows) {
    k.ctr = k.impr > 0 ? (k.clicks / k.impr) * 100 : 0;
    k.cvr = k.clicks > 0 ? (k.orders / k.clicks) * 100 : 0;
    k.dtgio = k.hours > 0 ? k.gmv / k.hours : 0;
    k.aov = k.orders > 0 ? k.gmv / k.orders : 0;
    k.watchAvg = k.viewers > 0 ? k.watchW / k.viewers : 0;
  }
  return rows;
}

// Score + grade every KOC, then persist into the koc_stats cache table.
export async function applyScores(db, stats, weights = DEFAULT_WEIGHTS) {
  const maxDtgio = Math.max(1, ...stats.map((k) => k.dtgio));
  const maxGmv = Math.max(1, ...stats.map((k) => k.gmv));
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const wsum = (w.dtgio + w.cvr + w.ctr + w.gmv + w.reg) || 100;

  for (const k of stats) {
    const comps = {
      dtgio: Math.min(100, (k.dtgio / (maxDtgio * 0.5)) * 100),
      cvr: Math.min(100, (k.cvr / 8) * 100),
      ctr: Math.min(100, (k.ctr / 5) * 100),
      gmv: Math.min(100, (Math.log10(k.gmv + 1) / Math.log10(maxGmv + 1)) * 100),
      reg: Math.min(100, (k.sessions / 30) * 100)
    };
    k.comps = comps;
    k.score = Math.round(
      (comps.dtgio * w.dtgio + comps.cvr * w.cvr + comps.ctr * w.ctr +
       comps.gmv * w.gmv + comps.reg * w.reg) / wsum
    );
    k.grade = gradeFor(k.score);
  }

  const INS = `
    INSERT INTO koc_stats
      (koc_id,sessions,gmv,gmv_live,orders,orders_live,hours,viewers,views,impr,clicks,
       comments,shares,likes,newfol,customers,distinct_sold,watch_avg,ctr,cvr,dtgio,aov,
       score,grade,comp_dtgio,comp_cvr,comp_ctr,comp_gmv,comp_reg)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  await db.tx(async (t) => {
    await t.run('DELETE FROM koc_stats');
    for (const k of stats) {
      await t.run(INS, [
        k.id, k.sessions, k.gmv, k.gmvLive, k.orders, k.ordersLive, k.hours, k.viewers,
        k.views, k.impr, k.clicks, k.comments, k.shares, k.likes, k.newfol, k.customers,
        k.distinctSold, k.watchAvg, k.ctr, k.cvr, k.dtgio, k.aov, k.score, k.grade,
        k.comps.dtgio, k.comps.cvr, k.comps.ctr, k.comps.gmv, k.comps.reg
      ]);
    }
  });
  return stats;
}
