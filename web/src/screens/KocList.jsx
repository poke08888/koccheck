import React, { useMemo } from 'react';
import { fmtVND, fmtInt, gradeColor, clean, initials } from '../format.js';

const COLS = [['sessions', 'Phiên'], ['hours', 'Giờ'], ['gmv', 'GMV'], ['orders', 'Đơn'], ['ctr', 'CTR'], ['cvr', 'CVR'], ['dtgio', 'DT/giờ'], ['score', 'Điểm']];

export default function KocList({ data, S, set, setFn }) {
  const koc = data.koc;
  const grades = data.grades;

  const gradeBuckets = [['S', 'Xuất sắc'], ['A', 'Tốt'], ['B', 'Khá'], ['C', 'Trung bình'], ['D', 'Cần cải thiện']]
    .map(([g, l]) => ({ g, l, n: grades[g] || 0, col: gradeColor(g) }));

  const rows = useMemo(() => {
    let list = koc.map((k, i) => ({ k, i }));
    if (S.q) {
      const q = S.q.toLowerCase();
      list = list.filter((o) => (o.k.name || '').toLowerCase().includes(q) || (o.k.user || '').toLowerCase().includes(q));
    }
    list.sort((a, b) => ((a.k[S.sortKey] || 0) - (b.k[S.sortKey] || 0)) * S.sortDir);
    return list;
  }, [koc, S.q, S.sortKey, S.sortDir]);

  const setSort = (key) => setFn((s) => ({ sortKey: key, sortDir: s.sortKey === key ? -s.sortDir : -1 }));
  const GT = '46px 2.1fr 1.3fr repeat(8,1fr) 50px';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 13, marginBottom: 18 }}>
        {gradeBuckets.map((b) => (
          <div key={b.g} className="lift" style={{ background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: b.col + '1f', border: `1.5px solid ${b.col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 18, color: b.col }}>{b.g}</div>
            <div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{b.n}</div>
              <div style={{ fontSize: 11.5, color: '#897B5F' }}>{b.l}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 12, padding: '11px 15px' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#897B5F" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input value={S.q} onChange={(e) => set({ q: e.target.value })} placeholder="Tìm theo tên KOC hoặc @username…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#211A0E', fontSize: 13.5, fontFamily: 'Manrope' }} />
        </div>
        <div className="lift" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 12, padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#6C5E45', cursor: 'pointer' }} onClick={() => exportCsv(rows)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F47B27" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>Xuất CSV
        </div>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GT, alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #E7DDCA', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: '#9C8F75', textTransform: 'uppercase' }}>
          <div>#</div><div>KOC</div><div>Username</div>
          {COLS.map(([k, l]) => (
            <div key={k} onClick={() => setSort(k)} style={{ textAlign: 'right', cursor: 'pointer', color: S.sortKey === k ? '#F47B27' : '#9C8F75', whiteSpace: 'nowrap' }}>
              {l} <span style={{ color: '#F47B27' }}>{S.sortKey === k ? (S.sortDir < 0 ? '▾' : '▴') : ''}</span>
            </div>
          ))}
          <div />
        </div>
        {rows.slice(0, 60).map((o, r) => {
          const k = o.k, gcol = gradeColor(k.grade);
          return (
            <div key={k.id} className="row" onClick={() => set({ screen: 'detail', kocIdx: o.i })} style={{ display: 'grid', gridTemplateColumns: GT, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #ECE3D2', cursor: 'pointer', transition: 'background .12s' }}>
              <div className="num" style={{ fontSize: 13, color: '#9C8F75', fontWeight: 600 }}>{r + 1}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#E7DDCA,#EFE6D5)', border: '1px solid #DCCFB6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#6C5E45', flexShrink: 0 }}>{initials(k.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clean(k.name)}</div>
                  <div style={{ fontSize: 11, color: '#9C8F75' }}>Hạng {k.grade}</div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: '#85775D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{k.user}</div>
              <Num v={fmtInt(k.sessions)} />
              <Num v={(k.hours || 0).toFixed(1).replace('.', ',') + 'h'} />
              <Num v={fmtVND(k.gmv)} c="#BE8A14" bold />
              <Num v={fmtInt(k.orders)} c="#BE8A14" />
              <Num v={(k.ctr || 0).toFixed(2).replace('.', ',') + '%'} />
              <Num v={(k.cvr || 0).toFixed(2).replace('.', ',') + '%'} c="#2E9C46" />
              <Num v={fmtVND(k.dtgio)} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div className="num" style={{ minWidth: 38, textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: gcol, background: gcol + '1c', border: `1px solid ${gcol}55`, borderRadius: 7, padding: '3px 0' }}>{k.score}</div></div>
              <div style={{ textAlign: 'right', color: '#D1C3A6', fontSize: 17, lineHeight: 1, fontWeight: 700 }}>›</div>
            </div>
          );
        })}
      </div>
      {rows.length > 60 && <div style={{ fontSize: 12, color: '#9C8F75', padding: '12px 4px' }}>Hiển thị 60 / {rows.length} KOC — dùng ô tìm kiếm để lọc.</div>}
    </div>
  );
}

const Num = ({ v, c = '#6C5E45', bold }) => (
  <div className="num" style={{ textAlign: 'right', fontSize: 13, color: c, fontWeight: bold ? 700 : 400 }}>{v}</div>
);

function exportCsv(rows) {
  const head = ['Rank', 'KOC', 'Username', 'Sessions', 'Hours', 'GMV', 'Orders', 'CTR', 'CVR', 'DT/h', 'Score', 'Grade'];
  const lines = [head.join(',')];
  rows.forEach((o, r) => {
    const k = o.k;
    lines.push([r + 1, '"' + (k.name || '').replace(/"/g, '""') + '"', k.user, k.sessions, (k.hours || 0).toFixed(1), Math.round(k.gmv), k.orders, (k.ctr || 0).toFixed(2), (k.cvr || 0).toFixed(2), Math.round(k.dtgio), k.score, k.grade].join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'koc-list.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
