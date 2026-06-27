import React, { useEffect, useMemo, useState } from 'react';
import { fmtVND, fmtNum, fmtInt, fmtSec, gradeColor, clean, initials, durLabel } from '../format.js';
import { fetchKocSessions } from '../api.js';

const RADAR_AXES = [
  ['Hiệu suất giờ', 'comp_dtgio'], ['Chuyển đổi', 'comp_cvr'], ['Thu hút', 'comp_ctr'],
  ['Quy mô', 'comp_gmv'], ['Đều đặn', 'comp_reg']
];

export default function KocDetail({ data, S, set }) {
  const koc = data.koc;
  const dk = koc[S.kocIdx] || koc[0] || {};
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (dk.id) fetchKocSessions(dk.id, 12).then(setSessions);
  }, [dk.id]);

  /* radar geometry from stored score components */
  const radar = useMemo(() => {
    const cx = 130, cy = 128, R = 92;
    const ang = (i) => (-90 + i * 72) * Math.PI / 180;
    const pt = (i, r) => [cx + Math.cos(ang(i)) * R * r, cy + Math.sin(ang(i)) * R * r];
    const comps = RADAR_AXES.map(([l, key]) => ({ l, v: Math.min(100, dk[key] || 0) }));
    const grid = [0.25, 0.5, 0.75, 1].map((r) => comps.map((_, i) => pt(i, r).map((n) => n.toFixed(1)).join(',')).join(' '));
    const valPoly = comps.map((c, i) => pt(i, c.v / 100).map((n) => n.toFixed(1)).join(',')).join(' ');
    const dots = comps.map((c, i) => { const p = pt(i, c.v / 100); return { x: p[0].toFixed(1), y: p[1].toFixed(1) }; });
    const axisL = comps.map((c, i) => { const p = pt(i, 1.2); return { x: p[0].toFixed(1), y: p[1].toFixed(1), l: c.l, a: Math.abs(Math.cos(ang(i))) < 0.3 ? 'middle' : (Math.cos(ang(i)) > 0 ? 'start' : 'end') }; });
    const spokes = comps.map((_, i) => { const p = pt(i, 1); return { x: p[0].toFixed(1), y: p[1].toFixed(1) }; });
    return { grid, valPoly, dots, axisL, spokes };
  }, [dk]);

  /* rank + benchmark vs system average */
  const meta = useMemo(() => {
    const sorted = [...koc].sort((a, b) => b.gmv - a.gmv);
    const rankIdx = sorted.findIndex((k) => k.id === dk.id);
    const avg = {
      cvr: koc.reduce((a, k) => a + k.cvr, 0) / koc.length,
      ctr: koc.reduce((a, k) => a + k.ctr, 0) / koc.length,
      dtgio: koc.reduce((a, k) => a + k.dtgio, 0) / koc.length
    };
    const bench = [
      { l: 'CVR', v: dk.cvr || 0, avg: avg.cvr, unit: '%', mult: dk.cvr / avg.cvr },
      { l: 'CTR', v: dk.ctr || 0, avg: avg.ctr, unit: '%', mult: dk.ctr / avg.ctr },
      { l: 'DT/giờ', v: dk.dtgio || 0, avg: avg.dtgio, unit: '', mult: dk.dtgio / avg.dtgio }
    ].map((b) => ({
      l: b.l, mult: (b.mult || 0).toFixed(1).replace('.', ','), good: b.mult >= 1,
      badgeCol: b.mult >= 1 ? '#2E9C46' : '#BE8A14', badgeBg: b.mult >= 1 ? '#EEF3DF' : '#FBF0DA', badgeBd: b.mult >= 1 ? '#D4E2B8' : '#E6D2A4',
      pctSelf: Math.min(100, b.v / Math.max(b.v, b.avg) * 100).toFixed(0), pctAvg: Math.min(100, b.avg / Math.max(b.v, b.avg) * 100).toFixed(0),
      selfV: b.unit === '%' ? b.v.toFixed(2).replace('.', ',') + '%' : fmtVND(b.v),
      avgV: b.unit === '%' ? b.avg.toFixed(2).replace('.', ',') + '%' : fmtVND(b.avg)
    }));
    return { rank: rankIdx + 1, total: koc.length, pctile: Math.max(1, Math.ceil((rankIdx + 1) / koc.length * 100)), bench };
  }, [koc, dk]);

  const stats = [
    { l: 'GMV tổng', v: fmtVND(dk.gmv), c: '#BE8A14' }, { l: 'GMV từ LIVE', v: fmtVND(dk.gmvLive), c: '#F47B27' },
    { l: 'Đơn hàng', v: fmtInt(dk.orders), c: '#BE8A14' }, { l: 'Phiên Live', v: fmtInt(dk.sessions), c: '#F47B27' },
    { l: 'Giờ Live', v: (dk.hours || 0).toFixed(1).replace('.', ',') + 'h', c: '#574C39' }, { l: 'DT / giờ', v: fmtVND(dk.dtgio), c: '#E2502F' },
    { l: 'AOV', v: fmtVND(dk.aov), c: '#BE8A14' }, { l: 'Xem TB', v: fmtSec(dk.watchAvg), c: '#F47B27' },
    { l: 'CTR', v: (dk.ctr || 0).toFixed(2).replace('.', ',') + '%', c: '#BE8A14' }, { l: 'CVR', v: (dk.cvr || 0).toFixed(2).replace('.', ',') + '%', c: '#2E9C46' }
  ];
  const eng = [
    { l: 'Người xem', v: fmtNum(dk.viewers) }, { l: 'Lượt xem', v: fmtNum(dk.views) }, { l: 'Lượt thích', v: fmtNum(dk.likes) },
    { l: 'Bình luận', v: fmtNum(dk.comments) }, { l: 'Lượt chia sẻ', v: fmtNum(dk.shares) }, { l: 'Follower mới', v: fmtNum(dk.newfol) }
  ];
  const strengths = meta.bench.filter((b) => b.good).map((b) => b.l).join(' · ') || '—';
  const weaks = meta.bench.filter((b) => !b.good).map((b) => b.l).join(' · ') || 'Không có điểm yếu nổi bật';
  const gcol = gradeColor(dk.grade);

  // GMV-per-session mini bars (chronological)
  const dBars = useMemo(() => {
    const chron = [...sessions].reverse();
    const vals = chron.map((s) => s.gmv);
    const max = Math.max(1, ...vals);
    return vals.map((v, i) => ({ x: (i * (560 / Math.max(1, vals.length)) + 6).toFixed(1), w: (560 / Math.max(1, vals.length) * 0.62).toFixed(1), y: (110 - v / max * 92).toFixed(1), h: (v / max * 92).toFixed(1) }));
  }, [sessions]);

  const CARD = { background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 18, padding: 20 };

  return (
    <div>
      <div onClick={() => set({ screen: 'koc' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#85775D', cursor: 'pointer', marginBottom: 16 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>Quay lại danh sách
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'linear-gradient(135deg,#FBF7EF,#FFFFFF)', border: '1px solid #E7DDCA', borderRadius: 18, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#F47B27,#BE8A14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(dk.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clean(dk.name)}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: gcol, background: gcol + '1c', border: `1px solid ${gcol}66`, padding: '3px 11px', borderRadius: 99 }}>Hạng {dk.grade}</span>
              </div>
              <div style={{ fontSize: 13.5, color: '#85775D', marginTop: 3 }}>@{dk.user}</div>
            </div>
            <div style={{ textAlign: 'center', paddingLeft: 18, borderLeft: '1px solid #E7DDCA' }}>
              <div className="num" style={{ fontSize: 40, fontWeight: 700, color: gcol, lineHeight: 1 }}>{dk.score}</div>
              <div style={{ fontSize: 11, color: '#9C8F75', marginTop: 4 }}>điểm tổng / 100</div>
            </div>
            <div style={{ textAlign: 'center', paddingLeft: 18, borderLeft: '1px solid #E7DDCA' }}>
              <div className="num" style={{ fontSize: 40, fontWeight: 700, color: '#F47B27', lineHeight: 1 }}>#{meta.rank}</div>
              <div style={{ fontSize: 11, color: '#9C8F75', marginTop: 4 }}>/ {meta.total} KOC · Top {meta.pctile}%</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 11, marginTop: 22 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ background: '#F7F2E8', border: '1px solid #E9DFCC', borderRadius: 12, padding: '13px 14px' }}>
                <div style={{ fontSize: 10.5, color: '#9C8F75', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 7 }}>{s.l}</div>
                <div className="num" style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={CARD}>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Hồ sơ năng lực</div>
          <div style={{ fontSize: 11, letterSpacing: '.05em', color: '#9C8F75', textTransform: 'uppercase', marginBottom: 6 }}>5 trục chấm điểm</div>
          <svg viewBox="0 0 260 256" style={{ width: '100%', height: 'auto' }}>
            {radar.grid.map((g, i) => <polygon key={i} points={g} fill="none" stroke="#E9DFCC" strokeWidth="1" />)}
            {radar.spokes.map((s, i) => <line key={i} x1="130" y1="128" x2={s.x} y2={s.y} stroke="#E9DFCC" strokeWidth="1" />)}
            <polygon points={radar.valPoly} fill="#F47B2722" stroke="#F47B27" strokeWidth="2" />
            {radar.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="3.2" fill="#F47B27" />)}
            {radar.axisL.map((a, i) => <text key={i} x={a.x} y={a.y} fill="#85775D" fontSize="10.5" fontWeight="600" textAnchor={a.a}>{a.l}</text>)}
          </svg>
        </div>
      </div>

      {/* benchmark + gmv per session */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={CARD}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 15, fontWeight: 600 }}>Đối chuẩn với trung bình hệ thống</div>
            <div style={{ fontSize: 11, letterSpacing: '.05em', color: '#9C8F75', textTransform: 'uppercase', marginTop: 3 }}>KOC này so với {koc.length} nhà sáng tạo</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {meta.bench.map((b, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#473D2D' }}>{b.l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: b.badgeCol, background: b.badgeBg, border: `1px solid ${b.badgeBd}`, padding: '2px 9px', borderRadius: 99 }}>{b.mult}× TB</span>
                </div>
                <BenchBar label="KOC" pct={b.pctSelf} val={b.selfV} fill="linear-gradient(90deg,#F47B27,#BE8A14)" valCol="#BE8A14" />
                <BenchBar label="TB" pct={b.pctAvg} val={b.avgV} fill="#CFBFA0" valCol="#85775D" small />
              </div>
            ))}
          </div>
        </div>

        <div style={CARD}>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 15, fontWeight: 600 }}>GMV theo phiên gần đây</div>
          <div style={{ fontSize: 11, letterSpacing: '.05em', color: '#9C8F75', textTransform: 'uppercase', margin: '3px 0 6px' }}>Diễn biến doanh thu từng buổi live</div>
          <svg viewBox="0 0 572 132" style={{ width: '100%', height: 'auto', display: 'block', marginTop: 8 }}>
            <line x1="0" y1="110" x2="572" y2="110" stroke="#E7DDCA" strokeWidth="1" />
            <defs><linearGradient id="dbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F47B27" /><stop offset="1" stopColor="#BE8A14" /></linearGradient></defs>
            {dBars.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="3" fill="url(#dbar)" />)}
          </svg>
          <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
            <div style={{ flex: 1, background: '#EEF3DF', border: '1px solid #D4E2B8', borderRadius: 11, padding: '11px 13px' }}>
              <div style={{ fontSize: 10.5, color: '#85775D', fontWeight: 600, marginBottom: 5 }}>ĐIỂM MẠNH</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#2E9C46' }}>{strengths}</div>
            </div>
            <div style={{ flex: 1, background: '#FBF0DA', border: '1px solid #E6D2A4', borderRadius: 11, padding: '11px 13px' }}>
              <div style={{ fontSize: 10.5, color: '#85775D', fontWeight: 600, marginBottom: 5 }}>CẦN CẢI THIỆN</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#BE8A14' }}>{weaks}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>
        <div style={CARD}>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Tương tác cộng đồng</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {eng.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#85775D' }}>{e.l}</span>
                <span className="num" style={{ fontSize: 16, fontWeight: 700, color: '#2C2417' }}>{e.v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, background: '#EEF3DF', border: '1px solid #E0D1AE', borderRadius: 12, padding: '13px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#BE8A14', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Gợi ý vận hành</div>
            <div style={{ fontSize: 12.5, color: '#6C5E45', lineHeight: 1.5 }}>Duy trì khung giờ hiệu quả nhất, tăng tần suất phiên có sản phẩm chủ lực để nâng DT/giờ.</div>
          </div>
        </div>

        <div style={CARD}>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Lịch sử phiên gần đây</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr 1fr 1.2fr 1fr', padding: '0 4px 11px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', color: '#9C8F75', textTransform: 'uppercase', borderBottom: '1px solid #E7DDCA' }}>
            <div>Ngày</div><div>Thời lượng</div><div style={{ textAlign: 'right' }}>GMV</div><div style={{ textAlign: 'right' }}>Đơn</div><div style={{ textAlign: 'right' }}>Người xem</div><div style={{ textAlign: 'right' }}>CTR</div>
          </div>
          {sessions.map((s, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr 1fr 1.2fr 1fr', alignItems: 'center', padding: '11px 4px', borderBottom: '1px solid #ECE3D2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#473D2D' }}><span style={{ width: 6, height: 6, borderRadius: 99, background: s.orders > 0 ? '#2E9C46' : '#E2502F' }} />{(s.date || '').slice(5)}</div>
              <div className="num" style={{ fontSize: 12.5, color: '#6C5E45' }}>{durLabel(s.durMin)}</div>
              <div className="num" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#BE8A14' }}>{s.gmv > 0 ? fmtVND(s.gmv) : '0 ₫'}</div>
              <div className="num" style={{ textAlign: 'right', fontSize: 12.5, color: '#BE8A14' }}>{fmtInt(s.orders)}</div>
              <div className="num" style={{ textAlign: 'right', fontSize: 12.5, color: '#6C5E45' }}>{fmtInt(s.viewers)}</div>
              <div className="num" style={{ textAlign: 'right', fontSize: 12.5, color: '#6C5E45' }}>{(s.ctr || 0).toFixed(2).replace('.', ',')}%</div>
            </div>
          ))}
          {sessions.length === 0 && <div style={{ fontSize: 12.5, color: '#9C8F75', padding: '14px 4px' }}>Đang tải phiên…</div>}
        </div>
      </div>
    </div>
  );
}

const BenchBar = ({ label, pct, val, fill, valCol, small }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: small ? 0 : 5 }}>
    <span style={{ fontSize: 10.5, color: '#85775D', width: 34 }}>{label}</span>
    <div style={{ flex: 1, height: 9, background: '#ECE3D2', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: pct + '%', background: fill, borderRadius: 99 }} /></div>
    <span className="num" style={{ fontSize: 11.5, fontWeight: small ? 600 : 700, color: valCol, width: 64, textAlign: 'right' }}>{val}</span>
  </div>
);
