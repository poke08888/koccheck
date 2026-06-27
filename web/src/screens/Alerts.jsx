import React from 'react';

const CATS = [['all', 'Tất cả'], ['risk', 'Rủi ro'], ['opportunity', 'Cơ hội'], ['optimize', 'Tối ưu'], ['positive', 'Tích cực']];

export default function Alerts({ data, S, set, setFn }) {
  const all = data.alerts.items;
  const summary = data.alerts.summary;

  const tabs = CATS.map(([k, l]) => ({
    k, l, n: k === 'all' ? all.length : all.filter((a) => a.cat === k).length,
    active: S.alertFilter === k
  }));
  const list = all.filter((a) => S.alertFilter === 'all' || a.cat === S.alertFilter);

  // mini-trend (illustrative cadence of alerts/day over 15 days)
  const aTrend = [3, 2, 4, 5, 3, 6, 4, 2, 5, 7, 4, 3, 5, 4, 6];
  const aMax = Math.max(...aTrend);
  const miniBars = aTrend.map((v, i) => ({ x: (i * (300 / 15) + 3).toFixed(1), w: (300 / 15 * 0.6).toFixed(1), y: (64 - v / aMax * 54).toFixed(1), h: (v / aMax * 54).toFixed(1), c: i === 9 ? '#E2502F' : '#E6D2A4' }));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr) 1.3fr', gap: 13, marginBottom: 18 }}>
        {summary.map((a, i) => (
          <div key={i} style={{ background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 14, padding: '15px 17px', display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 10, height: 38, borderRadius: 5, background: a.c }} />
            <div><div className="num" style={{ fontSize: 24, fontWeight: 700 }}>{a.n}</div><div style={{ fontSize: 11.5, color: '#897B5F' }}>{a.l}</div></div>
          </div>
        ))}
        <div style={{ background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 14, padding: '12px 16px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: '#9C8F75', textTransform: 'uppercase', marginBottom: 6 }}>Cảnh báo / ngày · 15 ngày</div>
          <svg viewBox="0 0 300 64" style={{ width: '100%', height: 42, display: 'block' }}>
            {miniBars.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill={b.c} />)}
          </svg>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {tabs.map((t) => (
          <div key={t.k} onClick={() => set({ alertFilter: t.k })} className="lift" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 15px', borderRadius: 99, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: t.active ? '#F47B27' : '#FBF7EF', border: `1px solid ${t.active ? '#F47B27' : '#E7DDCA'}`, color: t.active ? '#FFFFFF' : '#6C5E45' }}>
            {t.l}<span className="num" style={{ fontSize: 11, fontWeight: 700, background: t.active ? 'rgba(255,255,255,.25)' : '#E7DDCA', color: t.active ? '#FFFFFF' : '#85775D', padding: '1px 7px', borderRadius: 99 }}>{t.n}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {list.map((a) => {
          const expanded = S.alertOpen === a.id;
          return (
            <div key={a.id} style={{ background: a.bg, border: `1px solid ${a.bd}`, borderRadius: 15, overflow: 'hidden' }}>
              <div onClick={() => setFn((s) => ({ alertOpen: s.alertOpen === a.id ? null : a.id }))} style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 18, cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: a.sc + '22', border: `1px solid ${a.sc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a.sc} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#211A0E' }}>{a.title}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: a.sc, background: a.sc + '1c', border: `1px solid ${a.sc}44`, padding: '2px 9px', borderRadius: 99 }}>Mức {a.sev}</span>
                    <span style={{ fontSize: 11, color: '#9C8F75' }}>· {a.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6C5E45', lineHeight: 1.5, maxWidth: 760 }}>{a.desc}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="num" style={{ fontSize: 20, fontWeight: 700, color: a.sc }}>{a.metric}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#85775D', marginTop: 8 }}>{expanded ? 'Thu gọn ⌃' : 'Chi tiết ⌄'}</div>
                </div>
              </div>
              {expanded && (
                <div style={{ padding: '0 20px 18px 82px' }}>
                  <div style={{ borderTop: `1px solid ${a.bd}`, paddingTop: 15, display: 'flex', gap: 24 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#85775D', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>Hành động đề xuất</div>
                      {a.steps.map((st, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={a.sc} strokeWidth="2.4" style={{ marginTop: 1, flexShrink: 0 }}><path d="M20 6L9 17l-5-5" /></svg>
                          <span style={{ fontSize: 13, color: '#473D2D', lineHeight: 1.45 }}>{st}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ width: 200, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#85775D', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>Phụ trách</div>
                      <div style={{ background: '#F7F2E8', border: '1px solid #E7DDCA', borderRadius: 11, padding: '12px 14px', marginBottom: 10 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#211A0E' }}>{a.owner}</div>
                      </div>
                      <div onClick={(e) => { e.stopPropagation(); if (a.kocId) jumpToKoc(data, a.kocId, set); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: a.sc, borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>
                        {a.act}
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function jumpToKoc(data, kocId, set) {
  const idx = data.koc.findIndex((k) => k.id === kocId);
  if (idx >= 0) set({ screen: 'detail', kocIdx: idx });
}
