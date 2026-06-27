import React, { useRef, useState } from 'react';
import { fmtInt } from '../format.js';
import { uploadDataset, deleteDataset } from '../api.js';

export default function DataSources({ data, reload, user }) {
  const meta = data.meta;
  const ds = meta.datasets || [];
  const totalSessions = ds.reduce((a, d) => a + (d.sessions || 0), 0);
  const isAdmin = user?.role === 'admin';
  const canUpload = user?.role === 'admin' || user?.role === 'leader';
  const [delId, setDelId] = useState(null);

  const doDelete = async (d) => {
    if (!window.confirm(`Xoá dữ liệu "${d.label}" (${fmtInt(d.sessions)} phiên)? Hành động không thể hoàn tác.`)) return;
    setDelId(d.id); setMsg(null);
    try {
      const r = await deleteDataset(d.id);
      setMsg({ err: false, t: `Đã xoá ${fmtInt(r.removed)} phiên & chấm điểm lại.` });
      await reload();
    } catch (e) { setMsg({ err: true, t: 'Lỗi xoá: ' + e.message }); }
    setDelId(null);
  };

  const [brand, setBrand] = useState(meta.brands[0]?.name || 'Macaron Cos');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const doUpload = async (file) => {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { setMsg({ err: true, t: 'Chỉ chấp nhận file .xlsx' }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await uploadDataset(file, brand);
      setMsg({ err: false, t: `Đã nạp ${fmtInt(r.count)} phiên cho "${r.brand}" (${r.minDay} → ${r.maxDay}). Đã chấm điểm lại.` });
      await reload();
    } catch (e) {
      setMsg({ err: true, t: 'Lỗi: ' + e.message });
    }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#9C8F75', textTransform: 'uppercase', marginBottom: 9 }}>Gán dữ liệu cho Brand</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 12, padding: '13px 16px', marginBottom: 7, maxWidth: 380 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F47B27" strokeWidth="2"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" /><circle cx="7" cy="7" r="1.4" fill="#F47B27" stroke="none" /></svg>
        <select value={brand} onChange={(e) => setBrand(e.target.value)} disabled={!canUpload}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, color: '#211A0E', fontFamily: 'Manrope', cursor: 'pointer' }}>
          {meta.brands.map((b) => (
            <option key={b.id} value={b.name}>{b.name}</option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: 11.5, color: '#9C8F75', fontStyle: 'italic', marginBottom: 18 }}>* Một file upload chỉ phục vụ dữ liệu cho 1 brand duy nhất</div>

      <div
        onClick={() => canUpload && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); canUpload && setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (canUpload) doUpload(e.dataTransfer.files?.[0]); }}
        style={{ border: `1.5px dashed ${drag ? '#F47B27' : '#DBCEB5'}`, borderRadius: 18, padding: 48, textAlign: 'center', background: drag ? '#FBF0DA' : '#FFFFFF', marginBottom: 22, cursor: canUpload ? 'pointer' : 'default', opacity: canUpload ? 1 : .7, transition: 'all .15s' }}>
        <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={(e) => doUpload(e.target.files?.[0])} />
        <div style={{ width: 62, height: 62, borderRadius: 18, background: '#F4ECDB', border: '1px solid #DBCEB5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          {busy
            ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F47B27" strokeWidth="2.4" style={{ animation: 'flo 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg>
            : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F47B27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{busy ? 'Đang xử lý…' : <>Tải lên file cho <span style={{ color: '#F47B27' }}>{brand}</span></>}</div>
        <div style={{ fontSize: 13, color: '#85775D', marginBottom: 18 }}>
          {canUpload ? 'Kéo thả file .xlsx từ TikTok Shop vào đây hoặc click để chọn' : 'Cần quyền Leader hoặc Admin để tải dữ liệu lên'}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ECE3D2', border: '1px solid #DBCEB5', borderRadius: 10, padding: '9px 15px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', color: '#6C5E45', textTransform: 'uppercase' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F47B27" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>Excel format · header dòng 3
        </div>
        {msg && <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: msg.err ? '#E2502F' : '#2E9C46' }}>{msg.t}</div>}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#9C8F75', textTransform: 'uppercase', marginBottom: 11 }}>Quản lý dữ liệu ({ds.length} file)</div>
      {ds.map((d) => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 14, padding: '15px 18px', marginBottom: 13 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: '#E6F0D6', border: '1px solid #CFE0AE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E9C46" strokeWidth="2.4"><path d="M20 6L9 17l-5-5" /></svg></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{d.label}</span><span style={{ fontSize: 10, fontWeight: 700, color: '#F47B27', background: '#F4ECDB', border: '1px solid #DBCEB5', padding: '2px 8px', borderRadius: 6, letterSpacing: '.04em', textTransform: 'uppercase' }}>{brandNameOf(meta, d.brand_id)}</span></div>
            <div className="num" style={{ fontSize: 12, color: '#897B5F', marginTop: 3 }}>{fmtInt(d.sessions)} phiên · {d.date_from} → {d.date_to}</div>
          </div>
          {isAdmin && (
            <div onClick={() => doDelete(d)} title="Xoá dữ liệu" className="lift"
              style={{ width: 34, height: 34, borderRadius: 9, background: '#FBE9E2', border: '1px solid #F8D8CD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: delId === d.id ? 'default' : 'pointer', color: '#E2502F', opacity: delId === d.id ? .5 : 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </div>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg,#ECE3D2,#FBF7EF)', border: '1px solid #E1D6C0', borderRadius: 14, padding: '17px 18px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: '#F4ECDB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F47B27" strokeWidth="2"><path d="M3 3v18h18M7 14v3M12 9v8M17 5v12" /></svg></div>
        <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: '#9C8F75', textTransform: 'uppercase' }}>Tổng cộng trong hệ thống</div><div className="num" style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{fmtInt(totalSessions)} phiên LIVE đã sẵn sàng</div></div>
      </div>
    </div>
  );
}

const brandNameOf = (meta, id) => meta.brands.find((b) => b.id === id)?.name || meta.brands[0]?.name || '';
