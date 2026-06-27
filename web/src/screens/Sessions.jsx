import React, { useMemo } from 'react';
import { fmtVND, fmtInt, durLabel } from '../format.js';

export default function Sessions({ data, S, set }) {
  const days = data.days;
  const sess = data.sessionsSample;

  const stack = useMemo(() => {
    const PL = 46, PT = 14, BASE = 212;
    const innerW = 740 - PL - 14;
    const smax = Math.max(1, ...days.map((d) => d.gmv));
    const niceMax = Math.ceil(smax / 100) * 100;
    const sc2 = (BASE - PT) / niceMax;
    const stepX = innerW / days.length, sbw = Math.min(34, stepX * 0.6);
    const bars = days.map((d, i) => {
      const cx = PL + stepX * i + stepX / 2, x = cx - sbw / 2;
      const a = d.t12 || 0, b = d.t35 || 0, c = d.rest || 0;
      const ah = a * sc2, bh = b * sc2, ch = c * sc2;
      return {
        x: x.toFixed(1), cx: cx.toFixed(1), w: sbw.toFixed(1),
        ay: (BASE - ah).toFixed(1), ah: ah.toFixed(1),
        by: (BASE - ah - bh).toFixed(1), bh: bh.toFixed(1),
        cy: (BASE - ah - bh - ch).toFixed(1), ch: ch.toFixed(1),
        topY: (BASE - (ah + bh + ch)).toFixed(1), label: d.d, i
      };
    });
    const grid = []; const N = 4;
    for (let g = 0; g <= N; g++) { const val = niceMax * g / N; grid.push({ y: (BASE - val * sc2).toFixed(1), v: val >= 1000 ? (val / 1000).toFixed(1).replace('.', ',') + ' tỷ' : val + ' tr' }); }
    return { bars, grid, BASE };
  }, [days]);

  const sh = S.stackHover >= 0 ? days[S.stackHover] : null;
  const shBar = S.stackHover >= 0 ? stack.bars[S.stackHover] : null;
  const stackTip = sh ? {
    x: Math.min(560, Math.max(0, +shBar.cx - 70)), d: sh.d, tot: fmtVND((sh.gmv || 0) * 1e6), nkoc: sh.nkoc || '—',
    rows: [
      { l: 'Top 1–2', v: fmtVND((sh.t12 || 0) * 1e6), p: Math.round((sh.t12 || 0) / (sh.gmv || 1) * 100), c: '#F47B27' },
      { l: 'Top 3–5', v: fmtVND((sh.t35 || 0) * 1e6), p: Math.round((sh.t35 || 0) / (sh.gmv || 1) * 100), c: '#2E9C46' },
      { l: 'Còn lại', v: fmtVND((sh.rest || 0) * 1e6), p: Math.round((sh.rest || 0) / (sh.gmv || 1) * 100), c: '#BE8A14' }
    ]
  } : null;

  const GT = '1fr 1fr 1fr 1.3fr .9fr 1.2fr 1.1fr 1fr .9fr';

  return (
    <div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 18, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600 }}>Tỷ trọng đóng góp Top 5 KOC</div>
            <div style={{ fontSize: 11, letterSpacing: '.05em', color: '#9C8F75', textTransform: 'uppercase', marginTop: 3 }}>Phân tích thành phần GMV theo ngày</div>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, fontWeight: 600, color: '#6C5E45' }}>
            <Leg c="#F47B27">Top 1–2</Leg><Leg c="#2E9C46">Top 3–5</Leg><Leg c="#BE8A14">Còn lại</Leg>
          </div>
        </div>
        <svg viewBox="0 0 740 252" style={{ width: '100%', height: 'auto' }}>
          {stack.grid.map((g, i) => (<g key={i}><line x1="46" y1={g.y} x2="726" y2={g.y} stroke="#EFE7D8" /><text x="40" y={g.y} dy="3.5" fill="#A89B80" fontSize="10" textAnchor="end" fontFamily="Space Grotesk">{g.v}</text></g>))}
          {stack.bars.map((b) => (<g key={b.i}>
            <rect x={b.x} y={b.cy} width={b.w} height={b.ch} fill="#BE8A14" rx="2" />
            <rect x={b.x} y={b.by} width={b.w} height={b.bh} fill="#2E9C46" />
            <rect x={b.x} y={b.ay} width={b.w} height={b.ah} fill="#F47B27" rx="2" />
            <rect x={b.x} y={b.topY} width={b.w} height="6" fill="#211A0E" fillOpacity={S.stackHover === b.i ? 1 : 0} rx="2" />
            <text x={b.cx} y="226" fill="#9C8F75" fontSize="10" textAnchor="middle" fontFamily="Space Grotesk">{b.label}</text>
            <rect x={b.x} y="14" width={b.w} height="198" fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => set({ stackHover: b.i })} onMouseLeave={() => set({ stackHover: -1 })} />
          </g>))}
          <line x1="46" y1="212" x2="726" y2="212" stroke="#D8CBB2" strokeWidth="1.5" />
        </svg>
        {stackTip && (
          <div style={{ position: 'relative', height: 0 }}>
            <div style={{ position: 'absolute', left: stackTip.x, top: -228, width: 188, background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 12, padding: '12px 14px', boxShadow: '0 14px 36px rgba(40,30,16,.16)', pointerEvents: 'none', zIndex: 5 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700, color: '#211A0E' }}>{stackTip.d}</span>
                <span className="num" style={{ fontSize: 13, fontWeight: 700, color: '#F47B27' }}>{stackTip.tot}</span>
              </div>
              {stackTip.rows.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: r.c, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#6C5E45', flex: 1 }}>{r.l}</span>
                  <span className="num" style={{ fontSize: 12, fontWeight: 700, color: '#2C2417' }}>{r.v}</span>
                  <span className="num" style={{ fontSize: 11, color: '#A89B80', width: 30, textAlign: 'right' }}>{r.p}%</span>
                </div>
              ))}
              <div style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid #EFE7D8', fontSize: 11, color: '#A89B80' }}>{stackTip.nkoc} KOC livestream trong ngày</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600 }}>Chi tiết các phiên livestream</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#F47B27', background: '#F4ECDB', border: '1px solid #DBCEB5', padding: '6px 13px', borderRadius: 99 }}>{fmtInt(data.total.sessions)} phiên đã thực hiện</span>
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GT, padding: '13px 18px', borderBottom: '1px solid #E7DDCA', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', color: '#9C8F75', textTransform: 'uppercase' }}>
          <div>Ngày</div><div>Bắt đầu</div><div>Thời lượng</div><div style={{ textAlign: 'right' }}>GMV</div><div style={{ textAlign: 'right' }}>Đơn</div><div style={{ textAlign: 'right' }}>Người xem</div><div style={{ textAlign: 'right' }}>Hiển thị</div><div style={{ textAlign: 'right' }}>Nhấp</div><div style={{ textAlign: 'right' }}>CTR</div>
        </div>
        {sess.map((s, i) => (
          <div key={i} className="row" style={{ display: 'grid', gridTemplateColumns: GT, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #ECE3D2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#473D2D' }}><span style={{ width: 6, height: 6, borderRadius: 99, background: s.orders === 0 ? '#E2502F' : '#2E9C46' }} />{s.date}</div>
            <div className="num" style={{ fontSize: 12.5, color: '#6C5E45' }}>{s.start}</div>
            <div className="num" style={{ fontSize: 12.5, color: '#6C5E45' }}>{durLabel(s.durMin)}</div>
            <div className="num" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#2C2417' }}>{s.gmv > 0 ? fmtVND(s.gmv) : '0 ₫'}</div>
            <div className="num" style={{ textAlign: 'right', fontSize: 12.5, color: '#BE8A14' }}>{fmtInt(s.orders)}</div>
            <div className="num" style={{ textAlign: 'right', fontSize: 12.5, color: '#6C5E45' }}>{fmtInt(s.viewers)}</div>
            <div className="num" style={{ textAlign: 'right', fontSize: 12.5, color: '#6C5E45' }}>{fmtInt(s.impr)}</div>
            <div className="num" style={{ textAlign: 'right', fontSize: 12.5, color: '#6C5E45' }}>{fmtInt(s.clicks)}</div>
            <div className="num" style={{ textAlign: 'right', fontSize: 12.5, color: '#6C5E45' }}>{s.ctr}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const Leg = ({ c, children }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{children}</span>
);
