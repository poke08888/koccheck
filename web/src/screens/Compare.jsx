import React, { useMemo } from 'react';
import { fmtVND, fmtInt, gradeColor, clean, initials } from '../format.js';

const COLORS = ['#F47B27', '#BE8A14', '#C2801A'];
const MDEF = [
  ['gmv', 'GMV', (v) => fmtVND(v)], ['orders', 'Đơn hàng', (v) => fmtInt(v)],
  ['cvr', 'CVR', (v) => v.toFixed(2).replace('.', ',') + '%'], ['ctr', 'CTR', (v) => v.toFixed(2).replace('.', ',') + '%'],
  ['dtgio', 'DT / giờ', (v) => fmtVND(v)], ['aov', 'AOV', (v) => fmtVND(v)],
  ['hours', 'Giờ Live', (v) => v.toFixed(1).replace('.', ',') + 'h'], ['score', 'Điểm tổng', (v) => '' + v]
];

export default function Compare({ data, S, set, setFn }) {
  const koc = data.koc;
  const toggleCmp = (i) => setFn((s) => {
    const has = s.cmp.includes(i);
    if (has) return { cmp: s.cmp.filter((x) => x !== i) };
    if (s.cmp.length >= 3) return {};
    return { cmp: [...s.cmp, i] };
  });

  const cset = S.cmp.map((i) => koc[i]).filter(Boolean);
  const cards = cset.map((k, i) => ({ k, col: COLORS[i], gcol: gradeColor(k.grade), removeIdx: S.cmp[i] }));

  const rows = useMemo(() => MDEF.map(([key, label, f]) => {
    const vals = cset.map((k) => k[key] || 0);
    const mx = Math.max(...vals, 1);
    return { label, cells: cset.map((k, i) => ({ val: f(k[key] || 0), pct: ((k[key] || 0) / mx * 100).toFixed(0), best: (k[key] || 0) === mx && vals.length > 1, col: COLORS[i] })) };
  }), [cset]);

  const pickList = koc.map((k, i) => ({ k, i }))
    .filter((o) => !S.cmp.includes(o.i))
    .filter((o) => { if (!S.pickQ) return true; const q = S.pickQ.toLowerCase(); return (o.k.name || '').toLowerCase().includes(q) || (o.k.user || '').toLowerCase().includes(q); })
    .slice(0, 8);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: '#FFFFFF', border: `1px solid ${c.col}44`, borderRadius: 16, padding: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: c.col }} />
            <div onClick={() => toggleCmp(c.removeIdx)} className="lift" style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 7, background: '#ECE3D2', border: '1px solid #DBCEB5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#85775D' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: c.col + '22', border: `1px solid ${c.col}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 16, color: c.col }}>{initials(c.k.name)}</div>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clean(c.k.name)}</div>
                <div style={{ fontSize: 12, color: '#85775D' }}>@{c.k.user}</div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <div className="num" style={{ fontSize: 24, fontWeight: 700, color: c.gcol, lineHeight: 1 }}>{c.k.score}</div>
                <div style={{ fontSize: 10, color: '#9C8F75' }}>Hạng {c.k.grade}</div>
              </div>
            </div>
          </div>
        ))}
        {S.cmp.length < 3 && (
          <div onClick={() => set({ pickOpen: true, pickQ: '' })} className="lift" style={{ border: '1.5px dashed #DBCEB5', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, cursor: 'pointer', color: '#85775D', minHeight: 84 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: '#FBF7EF', border: '1px solid #DBCEB5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Thêm KOC để so sánh</span>
          </div>
        )}
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 18, padding: '8px 22px 14px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.1fr repeat(3,1fr)', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #EFE7D8', gap: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#85775D', textTransform: 'uppercase', letterSpacing: '.04em' }}>{r.label}</div>
            {r.cells.map((cell, j) => (
              <div key={j}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="num" style={{ fontSize: 15, fontWeight: 700, color: '#2C2417' }}>{cell.val}</span>
                  {cell.best && <span style={{ fontSize: 10, fontWeight: 700, color: '#2E9C46', background: '#E6F0D6', padding: '2px 7px', borderRadius: 99 }}>Tốt nhất</span>}
                </div>
                <div style={{ height: 6, background: '#ECE3D2', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: cell.pct + '%', background: cell.col, borderRadius: 99 }} /></div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {S.pickOpen && (
        <div onClick={() => set({ pickOpen: false })} style={{ position: 'fixed', inset: 0, background: 'rgba(40,30,16,.45)', zIndex: 40, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 480, background: '#FBF7EF', border: '1px solid #DBCEB5', borderRadius: 18, padding: 20, boxShadow: '0 28px 70px rgba(40,30,16,.40)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600 }}>Thêm KOC vào so sánh</div>
              <div onClick={() => set({ pickOpen: false })} style={{ width: 28, height: 28, borderRadius: 8, background: '#ECE3D2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#85775D' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6L6 18M6 6l12 12" /></svg></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F7F2E8', border: '1px solid #E7DDCA', borderRadius: 11, padding: '10px 14px', marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#85775D" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
              <input autoFocus value={S.pickQ} onChange={(e) => set({ pickQ: e.target.value })} placeholder="Tìm KOC…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#211A0E', fontSize: 13.5, fontFamily: 'Manrope' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {pickList.map((o) => (
                <div key={o.i} onClick={() => setFn((s) => ({ pickOpen: false, pickQ: '', cmp: s.cmp.length < 3 ? [...s.cmp, o.i] : s.cmp }))} className="navi" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 11px', borderRadius: 11, cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ECE3D2', border: '1px solid #DBCEB5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#6C5E45', flexShrink: 0 }}>{initials(o.k.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clean(o.k.name)}</div>
                    <div style={{ fontSize: 11.5, color: '#85775D' }}>@{o.k.user}</div>
                  </div>
                  <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: '#BE8A14' }}>{fmtVND(o.k.gmv)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: gradeColor(o.k.grade), background: gradeColor(o.k.grade) + '1c', border: `1px solid ${gradeColor(o.k.grade)}55`, borderRadius: 6, padding: '2px 7px' }}>{o.k.grade}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
