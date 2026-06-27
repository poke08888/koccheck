import React, { useMemo } from 'react';
import { fmtVND, fmtNum, fmtInt, pct, fmtSec, smooth, gradeColor, clean } from '../format.js';

export default function Overview({ data, S, set }) {
  const T = data.total;
  const koc = data.koc;
  const days = data.days;
  const hrs = data.hours;
  const grades = data.grades;

  /* ---------------- KPIs ---------------- */
  const kpis = useMemo(() => [
    { label: 'Doanh thu (GMV)', value: fmtVND(T.gmv), sub: 'Tổng GMV thực tế', accent: 'linear-gradient(90deg,#BE8A14,#A9790F)', color: '#BE8A14' },
    { label: 'Số phiên Live', value: fmtInt(T.sessions), sub: 'Đã tính theo bộ lọc', accent: '#F47B27', color: '#F47B27' },
    { label: 'Phiên ra đơn', value: fmtInt(T.withOrder), sub: pct(T.withOrder, T.sessions) + ' phiên có đơn', accent: '#2E9C46', color: '#2E9C46' },
    { label: 'Đơn hàng', value: fmtInt(T.orders), sub: 'Tổng đơn SKU', accent: '#C2801A', color: '#BE8A14' },
    { label: 'AOV', value: T.orders ? fmtVND(Math.round(T.gmv / T.orders)) : '—', sub: 'Doanh thu / đơn', accent: '#BE8A14', color: '#BE8A14' },
    { label: 'Doanh thu / giờ', value: T.hours ? fmtVND(Math.round(T.gmv / T.hours)) : '—', sub: 'GMV / tổng giờ live', accent: '#E2502F', color: '#E2502F' },
    { label: 'KOC Active', value: fmtInt(T.kocActive), sub: 'Creators hoạt động', accent: '#F47B27', color: '#F47B27' },
    { label: 'Giờ live TB/phiên', value: T.sessions ? (T.hours / T.sessions).toFixed(1).replace('.', ',') + 'h' : '—', sub: 'Thời lượng trung bình', accent: '#85775D', color: '#574C39' },
    { label: 'Lượt hiển thị', value: fmtNum(T.impr), sub: 'Product impressions', accent: '#C2801A', color: '#BE8A14' },
    { label: 'Lượt nhấp', value: fmtNum(T.clicks), sub: 'Product clicks', accent: '#BE8A14', color: '#BE8A14' },
    { label: 'CTR (blended)', value: T.impr ? (T.clicks / T.impr * 100).toFixed(2).replace('.', ',') + '%' : '—', sub: 'Clicks / Impressions', accent: '#BE8A14', color: '#BE8A14' },
    { label: 'CVR (blended)', value: T.clicks ? (T.orders / T.clicks * 100).toFixed(2).replace('.', ',') + '%' : '—', sub: 'Orders / Clicks', accent: '#2E9C46', color: '#2E9C46' },
    { label: 'GMV từ LIVE', value: fmtVND(T.gmvLive), sub: pct(T.gmvLive, T.gmv) + ' do LIVE tạo ra', accent: 'linear-gradient(90deg,#F47B27,#E2502F)', color: '#F47B27' },
    { label: 'Đơn từ LIVE', value: fmtInt(T.ordersLive), sub: pct(T.ordersLive, T.orders) + ' đơn từ LIVE', accent: '#F47B27', color: '#F47B27' },
    { label: 'Lượt xem LIVE', value: fmtNum(T.views), sub: 'Tổng view (khác người xem)', accent: '#C2801A', color: '#BE8A14' },
    { label: 'Xem TB / người', value: fmtSec(T.watchAvg), sub: 'Thời lượng giữ chân', accent: '#F47B27', color: '#F47B27' },
    { label: 'Lượt chia sẻ', value: fmtNum(T.shares), sub: 'Lan toả phiên LIVE', accent: '#BE8A14', color: '#BE8A14' },
    { label: 'SKU đã bán', value: fmtInt(T.distinctSold), sub: 'Số sản phẩm khác nhau', accent: '#2E9C46', color: '#2E9C46' }
  ], [T]);

  /* ---------------- trend chart (guard empty days to avoid crash) ---------------- */
  const trend = useMemo(() => {
    if (!days.length) return null; // xs would be empty => xs[xs.length-1] === undefined => TypeError
    const W = 740, pl = 12, pr = 12, top = 18;
    const gmax = Math.max(1, ...days.map((d) => d.gmv));
    const omax = Math.max(1, ...days.map((d) => d.orders));
    const xs = days.map((d, i) => pl + (W - pl - pr) * i / Math.max(1, days.length - 1));
    const gpts = days.map((d, i) => [xs[i], top + (208 - top) * (1 - d.gmv / gmax)]);
    const opts = days.map((d, i) => [xs[i], top + (208 - top) * (1 - d.orders / omax)]);
    const trendGmv = smooth(gpts), trendOrd = smooth(opts);
    const trendArea = trendGmv + ' L' + xs[xs.length - 1].toFixed(1) + ',208 L' + xs[0].toFixed(1) + ',208 Z';
    const trendDots = opts.map((p) => ({ x: p[0].toFixed(1), y: p[1].toFixed(1) }));
    const trendLabels = days.filter((_, i) => i % 2 === 0).map((d) => ({ x: xs[days.indexOf(d)].toFixed(1), t: d.d }));
    const trendHit = days.map((d, i) => ({
      x: (i === 0 ? 0 : (xs[i] + xs[i - 1]) / 2).toFixed(1),
      w: ((i === days.length - 1 ? W : (xs[i] + xs[i + 1]) / 2) - (i === 0 ? 0 : (xs[i] + xs[i - 1]) / 2)).toFixed(1),
      i
    }));
    return { W, xs, gpts, opts, trendGmv, trendOrd, trendArea, trendDots, trendLabels, trendHit };
  }, [days]);

  const hd = S.hoverDay;
  const hover = trend && hd != null && days[hd] ? {
    x: trend.xs[hd], gy: trend.gpts[hd][1], oy: trend.opts[hd][1], day: days[hd].d,
    gmv: fmtVND(days[hd].gmv * 1e6), orders: fmtInt(days[hd].orders), sessions: fmtInt(days[hd].sessions),
    tipX: Math.min(Math.max(trend.xs[hd] - 70, 6), trend.W - 150)
  } : null;

  /* ---------------- hour chart ---------------- */
  const hour = useMemo(() => {
    const HW = 460, hPL = 30, hPR = 8, hBASE = 206, hTOP = 14;
    const hInner = HW - hPL - hPR;
    const hmax = Math.max(1, ...hrs.map((h) => h.w + h.n));
    const hNice = Math.ceil(hmax / 100) * 100 || hmax;
    const hStep = hInner / 24, bw = Math.min(13, hStep * 0.66), hScale = (hBASE - hTOP) / hNice;
    const gold = [7, 19];
    const bars = hrs.map((h, i) => {
      const cx = hPL + hStep * i + hStep / 2, x = cx - bw / 2, tot = h.w + h.n;
      const fullH = tot * hScale, wh = h.w * hScale, nh = fullH - wh;
      return { x: x.toFixed(1), cx: cx.toFixed(1), w: bw.toFixed(1), ny: (hBASE - fullH).toFixed(1), nh: nh.toFixed(1), wy: (hBASE - wh).toFixed(1), wh: wh.toFixed(1), topY: (hBASE - fullH - 4).toFixed(1), i };
    });
    const labels = [0, 4, 8, 12, 16, 20, 23].map((hh) => ({ x: (hPL + hStep * hh + hStep / 2).toFixed(1), t: (hh < 10 ? '0' + hh : hh) + 'h', gold: gold.includes(hh) ? '#F47B27' : '#9C8F75' }));
    const grid = []; const N = 3;
    for (let g = 0; g <= N; g++) { const val = Math.round(hNice * g / N); grid.push({ y: (hBASE - val * hScale).toFixed(1), v: val }); }
    return { bars, labels, grid, hBASE };
  }, [hrs]);

  const hh = S.hourHover >= 0 ? hrs[S.hourHover] : null;
  const hhBar = S.hourHover >= 0 ? hour.bars[S.hourHover] : null;
  const hourTip = hh ? {
    x: Math.min(300, Math.max(0, +hhBar.cx - 72)),
    hr: (S.hourHover < 10 ? '0' + S.hourHover : S.hourHover) + ':00 – ' + (S.hourHover < 9 ? '0' + (S.hourHover + 1) : (S.hourHover + 1)) + ':00',
    tot: fmtInt(hh.w + hh.n), withO: fmtInt(hh.w), rate: ((hh.w / Math.max(1, hh.w + hh.n)) * 100).toFixed(1).replace('.', ',') + '%',
    gold: [7, 19].includes(S.hourHover)
  } : null;

  /* ---------------- top 10 bars ---------------- */
  const top10 = koc.slice(0, 10);
  const tmax = Math.max(1, ...top10.map((k) => k.gmv));
  const topBars = top10.map((k, i) => ({
    name: clean(k.name), pct: (k.gmv / tmax * 100).toFixed(1), val: fmtVND(k.gmv), grade: k.grade,
    sessions: fmtInt(k.sessions), cvr: (k.cvr || 0).toFixed(2).replace('.', ',') + '%', dtgio: fmtVND(k.dtgio),
    share: (k.gmv / T.gmv * 100).toFixed(1).replace('.', ',') + '%', i, idx: koc.indexOf(k)
  }));

  /* ---------------- scatter matrix ---------------- */
  const scatter = useMemo(() => {
    const SX0 = 52, SX1 = 600, SY0 = 24, SY1 = 196;
    const lg = (v) => Math.log10((+v || 0) + 1);
    const named = koc;
    const allH = named.map((k) => k.hours), allG = named.map((k) => k.gmv / 1e6);
    const xMin = lg(0), xMax = lg(Math.max(...allH, 320));
    const yMin = lg(1), yMax = lg(Math.max(...allG, 1));
    const px = (h) => SX0 + (SX1 - SX0) * ((lg(h) - xMin) / (xMax - xMin));
    const py = (g) => SY1 - (SY1 - SY0) * ((lg(g) - yMin) / (yMax - yMin));
    const median = (arr) => { const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const mx = px(median(allH)), my = py(median(allG));
    // background = all KOC; named (interactive) = top 40 by gmv
    const bgScatter = named.map((k) => ({ x: px(k.hours).toFixed(1), y: py(k.gmv / 1e6).toFixed(1) }));
    const pts = named.slice(0, 40).map((k, i) => {
      const g = k.gmv / 1e6;
      const c = k.grade === 'S' || k.grade === 'A' ? '#F47B27' : k.grade === 'B' ? '#2E9C46' : k.grade === 'C' ? '#BE8A14' : '#A89B80';
      return { x: px(k.hours).toFixed(1), y: py(g).toFixed(1), r: (g > 200 ? 8 : g > 60 ? 6 : g > 15 ? 5 : 4), c, i, k };
    });
    const xTicks = [1, 10, 50, 150, 320].map((h) => ({ x: px(h).toFixed(1), t: h + 'h' }));
    const yTicks = [10, 100, 1000].map((g) => ({ y: py(g).toFixed(1), t: g >= 1000 ? '1 tỷ' : g + ' tr' }));
    return { px, py, mx: mx.toFixed(1), my: my.toFixed(1), bgScatter, pts, xTicks, yTicks };
  }, [koc]);

  const sct = S.scHover >= 0 ? scatter.pts[S.scHover]?.k : null;
  const scTip = sct ? {
    x: Math.min(440, Math.max(0, scatter.px(sct.hours) - 78)), y: Math.max(0, scatter.py(sct.gmv / 1e6) - 86),
    name: clean(sct.name), grade: sct.grade, gcol: gradeColor(sct.grade),
    gmv: fmtVND(sct.gmv), hours: (sct.hours || 0).toFixed(1).replace('.', ',') + 'h', dtgio: fmtVND(sct.dtgio)
  } : null;

  /* ---------------- funnel + donut ---------------- */
  const funnel = useMemo(() => {
    const fImpr = T.impr, fClick = T.clicks, fOrd = T.orders;
    const raw = [{ l: 'Lượt hiển thị', v: fImpr, prev: null }, { l: 'Lượt nhấp', v: fClick, prev: fImpr }, { l: 'Đơn hàng', v: fOrd, prev: fClick }];
    return raw.map((f, i) => ({
      l: f.l, v: i === 2 ? fmtInt(f.v) : fmtNum(f.v), pct: f.v / fImpr * 100, c: i === 2 ? '#BE8A14' : '#F47B27',
      ofTop: (f.v / fImpr * 100).toFixed(2).replace('.', ',') + '%',
      fromPrev: f.prev ? (f.v / f.prev * 100).toFixed(2).replace('.', ',') + '%' : '100%',
      drop: f.prev ? fmtNum(f.prev - f.v) : '—', i
    }));
  }, [T]);
  const funnelSteps = [
    { l: 'CTR Hiển thị → Nhấp', v: (T.clicks / T.impr * 100).toFixed(2).replace('.', ',') + '%' },
    { l: 'CVR Nhấp → Đơn', v: (T.orders / T.clicks * 100).toFixed(2).replace('.', ',') + '%' }
  ];
  const funnelTip = S.funnelHover >= 0 ? (() => { const f = funnel[S.funnelHover]; return { ...f, top: (S.funnelHover * 44).toString() }; })() : null;

  const donut = useMemo(() => {
    const gTotal = Object.values(grades).reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    const segs = [['S', '#F47B27'], ['A', '#BE8A14'], ['B', '#2E9C46'], ['C', '#C2801A'], ['D', '#9C8F75']].map(([g, c]) => {
      const n = grades[g] || 0, frac = n / gTotal, a0 = acc; acc += frac; const a1 = acc;
      const arc = (a0, a1) => {
        const r = 54, R = 78, cx = 90, cy = 90;
        const s = 2 * Math.PI * a0 - Math.PI / 2, e = 2 * Math.PI * a1 - Math.PI / 2;
        const x0 = cx + R * Math.cos(s), y0 = cy + R * Math.sin(s), x1 = cx + R * Math.cos(e), y1 = cy + R * Math.sin(e);
        const xi1 = cx + r * Math.cos(e), yi1 = cy + r * Math.sin(e), xi0 = cx + r * Math.cos(s), yi0 = cy + r * Math.sin(s);
        const laf = (a1 - a0) > 0.5 ? 1 : 0;
        return `M${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 ${laf} 1 ${x1.toFixed(1)},${y1.toFixed(1)} L${xi1.toFixed(1)},${yi1.toFixed(1)} A${r},${r} 0 ${laf} 0 ${xi0.toFixed(1)},${yi0.toFixed(1)} Z`;
      };
      return { g, c, n, pct: (frac * 100).toFixed(1).replace('.', ','), d: n > 0 ? arc(a0, a1) : '' };
    });
    return { segs, gTotal };
  }, [grades]);
  const dHover = S.donutHover ? donut.segs.find((d) => d.g === S.donutHover) : null;
  const donutBig = dHover ? '' + dHover.n : '' + donut.gTotal;
  const donutSmall = dHover ? `Hạng ${dHover.g} · ${dHover.pct}%` : 'KOC';

  const CARD = { background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 18, padding: '20px 22px' };
  const H = (t, s) => (
    <>
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600 }}>{t}</div>
      <div style={{ fontSize: 11, letterSpacing: '.05em', color: '#9C8F75', textTransform: 'uppercase', marginTop: 3 }}>{s}</div>
    </>
  );

  return (
    <div>
      {/* INSIGHTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        {data.insights.map((ins, i) => (
          <div key={i} className="lift" style={{ background: `linear-gradient(160deg,${ins.g1},${ins.g2})`, border: `1px solid ${ins.bd}`, borderRadius: 15, padding: '15px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: ins.ic, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ins.icc }}>
                <Svg d={ins.icon} sw={2.2} size={15} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: ins.icc, textTransform: 'uppercase' }}>{ins.tag}</span>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: '#2C2417' }}>{ins.text}</div>
          </div>
        ))}
      </div>

      {/* KPI GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} className="lift" style={{ ...CARD, background: '#FBF7EF', borderRadius: 15, padding: '16px 16px 15px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: k.accent, opacity: .85 }} />
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', color: '#897B5F', textTransform: 'uppercase', marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
            <div className="num" style={{ fontSize: 27, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#9C8F75', marginTop: 8 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* CHARTS ROW 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>{H('Xu hướng Doanh thu', 'Diễn biến GMV & Đơn theo ngày')}</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, fontWeight: 600 }}>
              <Legend c="#BE8A14" line>GMV</Legend><Legend c="#F47B27" line>Đơn hàng</Legend>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            {!trend ? (
              <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9C8F75', fontSize: 14, gap: 8 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#DBCEB5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18 M7 16l3-4 4 3 5-7"/></svg>
                <span style={{ fontWeight: 600 }}>Không có dữ liệu cho khoảng ngày đã chọn</span>
              </div>
            ) : (
            <svg viewBox="0 0 740 250" style={{ width: '100%', height: 'auto', display: 'block' }}>
              <defs><linearGradient id="gmvfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BE8A14" stopOpacity=".30" /><stop offset="1" stopColor="#BE8A14" stopOpacity="0" /></linearGradient></defs>
              {[18, 66, 113, 160, 208].map((y, i) => <line key={i} x1="8" y1={y} x2="732" y2={y} stroke="#E9DFCC" strokeWidth="1" />)}
              <path d={trend.trendArea} fill="url(#gmvfill)" />
              <path d={trend.trendGmv} fill="none" stroke="#BE8A14" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d={trend.trendOrd} fill="none" stroke="#F47B27" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" />
              {trend.trendDots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="3.2" fill="#F47B27" stroke="#FFFFFF" strokeWidth="2" />)}
              {hover && (<>
                <line x1={hover.x} y1="14" x2={hover.x} y2="208" stroke="#F47B27" strokeWidth="1" strokeOpacity=".5" />
                <circle cx={hover.x} cy={hover.gy} r="5" fill="#BE8A14" stroke="#FFFFFF" strokeWidth="2.5" />
                <circle cx={hover.x} cy={hover.oy} r="5" fill="#F47B27" stroke="#FFFFFF" strokeWidth="2.5" />
              </>)}
              {trend.trendLabels.map((l, i) => <text key={i} x={l.x} y="244" fill="#9C8F75" fontSize="11" textAnchor="middle" fontFamily="Space Grotesk">{l.t}</text>)}
              {trend.trendHit.map((h, i) => <rect key={i} x={h.x} y="0" width={h.w} height="212" fill="transparent" onMouseEnter={() => set({ hoverDay: h.i })} onMouseLeave={() => set({ hoverDay: null })} />)}
            </svg>
            )}
            {hover && (
              <div style={{ position: 'absolute', top: 6, left: `calc(${hover.tipX} / 740 * 100%)`, background: '#F4ECDB', border: '1px solid #D7C8AC', borderRadius: 11, padding: '10px 13px', pointerEvents: 'none', boxShadow: '0 10px 28px rgba(40,30,16,.25)', minWidth: 132 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#473D2D', marginBottom: 7 }}>Ngày {hover.day}</div>
                <TipRow l="GMV" v={hover.gmv} c="#BE8A14" />
                <TipRow l="Đơn" v={hover.orders} c="#F47B27" />
                <TipRow l="Phiên" v={hover.sessions} c="#473D2D" last />
              </div>
            )}
          </div>
        </div>

        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>{H('Khung giờ Peak LIVE', 'Phân bổ phiên theo giờ')}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 600 }}>
              <Legend c="#F47B27">Có đơn</Legend><Legend c="#DBCEB5">Không</Legend>
            </div>
          </div>
          <svg viewBox="0 0 460 250" style={{ width: '100%', height: 'auto', display: 'block' }}>
            {hour.grid.map((g, i) => (<g key={i}><line x1="30" y1={g.y} x2="452" y2={g.y} stroke="#EFE7D8" /><text x="25" y={g.y} dy="3.5" fill="#A89B80" fontSize="9.5" textAnchor="end" fontFamily="Space Grotesk">{g.v}</text></g>))}
            {hour.bars.map((b) => (<g key={b.i}>
              <rect x={b.x} y={b.ny} width={b.w} height={b.nh} rx="2" fill="#DBCEB5" />
              <rect x={b.x} y={b.wy} width={b.w} height={b.wh} rx="2" fill="#F47B27" />
              <rect x={b.x} y={b.topY} width={b.w} height="4" fill="#211A0E" fillOpacity={S.hourHover === b.i ? 1 : 0} rx="2" />
              <rect x={b.x} y="14" width={b.w} height="192" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => set({ hourHover: b.i })} onMouseLeave={() => set({ hourHover: -1 })} />
            </g>))}
            <line x1="30" y1="206" x2="452" y2="206" stroke="#D8CBB2" strokeWidth="1.5" />
            {hour.labels.map((l, i) => <text key={i} x={l.x} y="222" fill={l.gold} fontSize="10.5" textAnchor="middle" fontFamily="Space Grotesk">{l.t}</text>)}
          </svg>
          {hourTip && (
            <div style={{ position: 'relative', height: 0 }}>
              <div style={{ position: 'absolute', left: hourTip.x, top: -150, width: 172, background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 12, padding: '11px 13px', boxShadow: '0 14px 36px rgba(40,30,16,.16)', pointerEvents: 'none', zIndex: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                  <span style={{ fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700, color: '#211A0E' }}>{hourTip.hr}</span>
                  {hourTip.gold && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#F47B27', background: '#FBF0DA', border: '1px solid #F6E5C2', padding: '1px 6px', borderRadius: 99 }}>Giờ vàng</span>}
                </div>
                <Row l="Tổng phiên" v={hourTip.tot} />
                <Row l={<><span style={{ width: 8, height: 8, borderRadius: 2, background: '#F47B27', display: 'inline-block', marginRight: 6 }} />Có đơn</>} v={hourTip.withO} c="#F47B27" />
                <Row l="Tỷ lệ ra đơn" v={hourTip.rate} c="#2E9C46" top />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHARTS ROW 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 16 }}>
        <div style={CARD}>
          {H('Top 10 KOC theo GMV', 'Xếp hạng hiệu suất tài chính')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 16 }}>
            {topBars.map((b) => (
              <div key={b.i} onMouseEnter={() => set({ barHover: b.i })} onMouseLeave={() => set({ barHover: -1 })} onClick={() => set({ screen: 'detail', kocIdx: b.idx })} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '6px 8px', margin: '0 -8px', borderRadius: 9, cursor: 'pointer', background: S.barHover === b.i ? '#FBF7EF' : 'transparent', transition: 'background .14s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 120, fontSize: 12.5, fontWeight: 600, color: '#473D2D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{b.name}</div>
                  <div style={{ flex: 1, height: 22, background: '#ECE3D2', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', width: b.pct + '%', background: 'linear-gradient(90deg,#BE8A14,#F47B27)', borderRadius: 6 }} />
                  </div>
                  <div className="num" style={{ width: 62, fontSize: 12.5, fontWeight: 700, color: '#6C5E45' }}>{b.val}</div>
                </div>
                {S.barHover === b.i && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 130, fontSize: 11, color: '#85775D' }}>
                    <span>Hạng <b style={{ color: '#211A0E' }}>{b.grade}</b></span><span>{b.sessions} phiên</span>
                    <span>CVR <b style={{ color: '#2E9C46' }}>{b.cvr}</b></span><span>DT/giờ <b style={{ color: '#211A0E' }}>{b.dtgio}</b></span>
                    <span>{b.share} GMV kỳ</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={CARD}>
          {H('Ma trận hiệu suất KOC', 'Nỗ lực (giờ live) × Kết quả (GMV)')}
          <svg viewBox="0 0 620 250" style={{ width: '100%', height: 'auto', display: 'block', marginTop: 6 }}>
            {scatter.yTicks.map((t, i) => (<g key={i}><line x1="52" y1={t.y} x2="600" y2={t.y} stroke="#F3ECDF" /><text x="48" y={t.y} dy="3" fill="#A89B80" fontSize="9" textAnchor="end" fontFamily="Space Grotesk">{t.t}</text></g>))}
            <line x1="52" y1="196" x2="600" y2="196" stroke="#D7C8AC" strokeWidth="1.2" />
            <line x1="52" y1="24" x2="52" y2="196" stroke="#D7C8AC" strokeWidth="1.2" />
            <line x1={scatter.mx} y1="24" x2={scatter.mx} y2="196" stroke="#D8CBB2" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="52" y1={scatter.my} x2="600" y2={scatter.my} stroke="#D8CBB2" strokeWidth="1" strokeDasharray="4 4" />
            <text x="60" y="38" fill="#F47B27" fontSize="10" fontWeight="700">HIỆU QUẢ CAO</text>
            <text x="592" y="38" fill="#F47B27" fontSize="10" fontWeight="700" textAnchor="end">NGÔI SAO BỀN BỈ</text>
            <text x="60" y="189" fill="#A89B80" fontSize="10" fontWeight="700">TIỀM NĂNG / ÍT GIỜ</text>
            <text x="592" y="189" fill="#BE8A14" fontSize="10" fontWeight="700" textAnchor="end">CẦN TỐI ƯU CHUYỂN ĐỔI</text>
            {scatter.bgScatter.map((p, i) => <circle key={'b' + i} cx={p.x} cy={p.y} r="2.5" fill="#C9BCA3" fillOpacity=".4" />)}
            {scatter.pts.map((p) => (<g key={p.i}>
              <circle cx={p.x} cy={p.y} r={p.r} fill={p.c} fillOpacity=".85" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx={p.x} cy={p.y} r="13" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => set({ scHover: p.i })} onMouseLeave={() => set({ scHover: -1 })} />
            </g>))}
            {scatter.xTicks.map((t, i) => <text key={i} x={t.x} y="212" fill="#9C8F75" fontSize="9.5" textAnchor="middle" fontFamily="Space Grotesk">{t.t}</text>)}
            <text x="600" y="230" fill="#A89B80" fontSize="9.5" textAnchor="end" fontStyle="italic">Trục ngang: giờ live · Trục dọc: GMV (thang log)</text>
          </svg>
          {scTip && (
            <div style={{ position: 'relative', height: 0 }}>
              <div style={{ position: 'absolute', left: scTip.x, top: scTip.y, width: 188, background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 12, padding: '11px 13px', boxShadow: '0 14px 36px rgba(40,30,16,.18)', pointerEvents: 'none', zIndex: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#211A0E', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scTip.name}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: scTip.gcol, background: scTip.gcol + '1c', border: `1px solid ${scTip.gcol}55`, borderRadius: 6, padding: '2px 7px' }}>{scTip.grade}</span>
                </div>
                <Row l="GMV" v={scTip.gmv} c="#F47B27" />
                <Row l="Giờ live" v={scTip.hours} />
                <Row l="DT / giờ" v={scTip.dtgio} c="#2E9C46" top />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHARTS ROW 3: funnel + donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 16, marginTop: 16 }}>
        <div style={CARD}>
          {H('Phễu chuyển đổi toàn kỳ', 'Hiển thị → Nhấp → Đơn hàng')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', marginTop: 18 }}>
            {funnel.map((f) => (
              <div key={f.i} onMouseEnter={() => set({ funnelHover: f.i })} onMouseLeave={() => set({ funnelHover: -1 })} style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', opacity: (S.funnelHover >= 0 && S.funnelHover !== f.i) ? .5 : 1, transition: 'opacity .14s' }}>
                <div style={{ width: 96, fontSize: 12.5, fontWeight: 600, color: '#473D2D' }}>{f.l}</div>
                <div style={{ flex: 1, height: 34, background: '#ECE3D2', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: f.pct + '%', background: `linear-gradient(90deg,${f.c},${f.c}cc)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12, minWidth: 62 }}>
                    <span className="num" style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>{f.v}</span>
                  </div>
                </div>
              </div>
            ))}
            {funnelTip && (
              <div style={{ position: 'absolute', left: 110, top: funnelTip.top + 'px', background: '#211A0E', borderRadius: 9, padding: '8px 12px', boxShadow: '0 10px 26px rgba(40,30,16,.28)', pointerEvents: 'none', zIndex: 6, display: 'flex', gap: 16, alignItems: 'center' }}>
                <TipMini l="% trên hiển thị" v={funnelTip.ofTop} c="#FFB070" />
                <TipMini l="Từ bước trước" v={funnelTip.fromPrev} c="#5CC771" />
                {funnelTip.drop !== '—' && <TipMini l="Rớt lại" v={funnelTip.drop} c="#FF8A3D" />}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            {funnelSteps.map((s, i) => (
              <div key={i} style={{ flex: 1, background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 11, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#85775D', fontWeight: 600, marginBottom: 6 }}>{s.l}</div>
                <div className="num" style={{ fontSize: 19, fontWeight: 700, color: '#F47B27' }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={CARD}>
          {H('Phân bổ hạng KOC', `${donut.gTotal} nhà sáng tạo theo điểm`)}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 6 }}>
            <svg viewBox="0 0 180 180" style={{ width: 148, height: 148, flexShrink: 0 }}>
              {donut.segs.map((d) => d.d && <path key={d.g} d={d.d} fill={d.c} fillOpacity={(S.donutHover && S.donutHover !== d.g) ? .32 : 1} style={{ cursor: 'pointer', transition: 'fill-opacity .14s' }} onMouseEnter={() => set({ donutHover: d.g })} onMouseLeave={() => set({ donutHover: null })} />)}
              <text x="90" y="84" fill="#211A0E" fontSize="26" fontWeight="700" textAnchor="middle" fontFamily="Space Grotesk">{donutBig}</text>
              <text x="90" y="104" fill="#85775D" fontSize="11" textAnchor="middle">{donutSmall}</text>
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {donut.segs.map((d) => (
                <div key={d.g} onMouseEnter={() => set({ donutHover: d.g })} onMouseLeave={() => set({ donutHover: null })} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 7px', margin: '0 -7px', borderRadius: 8, cursor: 'pointer', background: S.donutHover === d.g ? '#FBF7EF' : 'transparent', transition: 'background .14s' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: d.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#473D2D', width: 16 }}>{d.g}</span>
                  <div style={{ flex: 1, height: 6, background: '#ECE3D2', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: d.pct + '%', background: d.c }} /></div>
                  <span className="num" style={{ fontSize: 12, color: '#6C5E45', width: 30, textAlign: 'right' }}>{d.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Svg = ({ d, sw = 2, size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const Legend = ({ c, line, children }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6C5E45' }}>
    <span style={{ width: line ? 14 : 10, height: line ? 3 : 10, borderRadius: line ? 2 : 3, background: c }} />{children}
  </span>
);
const TipRow = ({ l, v, c, last }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: last ? 0 : 4 }}>
    <span style={{ fontSize: 11, color: '#85775D' }}>{l}</span>
    <span className="num" style={{ fontSize: 12.5, fontWeight: 700, color: c }}>{v}</span>
  </div>
);
const Row = ({ l, v, c = '#2C2417', top }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, paddingTop: top ? 6 : 0, borderTop: top ? '1px solid #EFE7D8' : 'none' }}>
    <span style={{ fontSize: 12, color: '#6C5E45', display: 'flex', alignItems: 'center' }}>{l}</span>
    <span className="num" style={{ fontSize: 12.5, fontWeight: 700, color: c }}>{v}</span>
  </div>
);
const TipMini = ({ l, v, c }) => (
  <div><div style={{ fontSize: 9.5, color: '#C9BCA3', textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div><div className="num" style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div></div>
);
