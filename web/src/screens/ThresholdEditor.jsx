import React, { useState } from 'react';
import { saveThresholds } from '../api.js';

const SWATCHES = [
  { c: '#E2502F', n: 'Đỏ' }, { c: '#BE8A14', n: 'Vàng' }, { c: '#2E9C46', n: 'Xanh' },
  { c: '#F47B27', n: 'Cam' }, { c: '#9C8F75', n: 'Xám' }
];

export default function ThresholdEditor({ thresholds, reload, editable }) {
  const [list, setList] = useState(() => (thresholds || []).map((t) => ({ ...t })));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const dirty = JSON.stringify(list) !== JSON.stringify(thresholds || []);

  const upd = (i, patch) => setList((ls) => ls.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const add = () => setList((ls) => [...ls, { l: 'Ngưỡng mới', d: '', v: '', c: '#BE8A14' }]);
  const del = (i) => setList((ls) => ls.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true); setMsg(null);
    try { const r = await saveThresholds(list); setList(r.thresholds.map((t) => ({ ...t }))); setMsg('Đã lưu ngưỡng cảnh báo.'); await reload(); }
    catch (e) { setMsg('Lỗi: ' + e.message); }
    setSaving(false);
  };

  const CARD = { background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 18, padding: 22 };

  if (!editable) {
    return (
      <div style={CARD}>
        <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Ngưỡng cảnh báo tự động</div>
        <div style={{ fontSize: 12.5, color: '#897B5F', marginBottom: 20 }}>Hệ thống quét mỗi giờ và bắn cảnh báo khi vượt ngưỡng.</div>
        {list.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid #EFE7D8' }}>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: '#473D2D' }}>{t.l}</div><div style={{ fontSize: 11.5, color: '#9C8F75', marginTop: 2 }}>{t.d}</div></div>
            <div className="num" style={{ fontSize: 14, fontWeight: 700, color: t.c, background: t.c + '1a', border: `1px solid ${t.c}44`, padding: '5px 13px', borderRadius: 9, whiteSpace: 'nowrap' }}>{t.v}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Ngưỡng cảnh báo tự động</div>
          <div style={{ fontSize: 12.5, color: '#897B5F', marginBottom: 18 }}>Thêm / sửa / xoá ngưỡng. Hệ thống quét mỗi giờ và cảnh báo khi vượt.</div>
        </div>
      </div>

      {list.map((t, i) => (
        <div key={i} style={{ background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={t.l} onChange={(e) => upd(i, { l: e.target.value })} placeholder="Tên ngưỡng" style={{ ...inp, flex: 1 }} />
            <input value={t.v} onChange={(e) => upd(i, { v: e.target.value })} placeholder="Giá trị (vd: > 35% GMV)" style={{ ...inp, width: 150 }} />
            <div onClick={() => del(i)} title="Xoá" className="lift" style={{ width: 36, height: 36, borderRadius: 9, background: '#FBE9E2', border: '1px solid #F8D8CD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#E2502F', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={t.d} onChange={(e) => upd(i, { d: e.target.value })} placeholder="Mô tả ngắn" style={{ ...inp, flex: 1 }} />
            <div style={{ display: 'flex', gap: 5 }}>
              {SWATCHES.map((s) => (
                <div key={s.c} onClick={() => upd(i, { c: s.c })} title={s.n}
                  style={{ width: 22, height: 22, borderRadius: 6, background: s.c, cursor: 'pointer', border: t.c === s.c ? '2px solid #211A0E' : '2px solid transparent' }} />
              ))}
            </div>
          </div>
        </div>
      ))}

      <div onClick={add} className="lift" style={{ border: '1.5px dashed #DBCEB5', borderRadius: 11, padding: '10px', textAlign: 'center', cursor: 'pointer', color: '#85775D', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
        + Thêm ngưỡng
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={save} disabled={!dirty || saving} style={{ background: dirty ? '#F47B27' : '#E7DDCA', color: dirty ? '#fff' : '#A89B80', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: dirty ? 'pointer' : 'default', fontFamily: 'Manrope' }}>
          {saving ? 'Đang lưu…' : 'Lưu ngưỡng'}
        </button>
        {dirty && <button onClick={() => setList((thresholds || []).map((t) => ({ ...t })))} style={{ background: 'none', border: '1px solid #E7DDCA', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#85775D', cursor: 'pointer', fontFamily: 'Manrope' }}>Hoàn tác</button>}
        {msg && <span style={{ fontSize: 12.5, color: msg.startsWith('Lỗi') ? '#E2502F' : '#2E9C46', fontWeight: 600 }}>{msg}</span>}
      </div>
    </div>
  );
}

const inp = { background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 9, padding: '9px 12px', fontSize: 13, fontFamily: 'Manrope', outline: 'none', color: '#211A0E' };
