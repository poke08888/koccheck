import React, { useState } from 'react';
import { changePassword } from '../api.js';

export default function ChangePassword() {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [nw2, setNw2] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (nw !== nw2) { setMsg({ err: true, t: 'Mật khẩu mới không khớp' }); return; }
    setBusy(true); setMsg(null);
    try {
      await changePassword(cur, nw);
      setCur(''); setNw(''); setNw2('');
      setMsg({ err: false, t: 'Đã đổi mật khẩu.' });
    } catch (e2) { setMsg({ err: true, t: 'Lỗi: ' + e2.message }); }
    setBusy(false);
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 18, padding: 22, marginTop: 16 }}>
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Đổi mật khẩu của tôi</div>
      <div style={{ fontSize: 12.5, color: '#897B5F', marginBottom: 16 }}>Mật khẩu mới tối thiểu 6 ký tự.</div>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, alignItems: 'end', maxWidth: 620 }}>
        <Field label="Mật khẩu hiện tại"><input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} style={inp} /></Field>
        <Field label="Mật khẩu mới"><input type="password" required value={nw} onChange={(e) => setNw(e.target.value)} style={inp} /></Field>
        <Field label="Nhập lại mật khẩu mới"><input type="password" required value={nw2} onChange={(e) => setNw2(e.target.value)} style={inp} /></Field>
      </form>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button onClick={submit} disabled={busy} style={{ background: '#F47B27', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'Manrope', opacity: busy ? .7 : 1 }}>
          {busy ? 'Đang đổi…' : 'Đổi mật khẩu'}
        </button>
        {msg && <span style={{ fontSize: 12.5, fontWeight: 600, color: msg.err ? '#E2502F' : '#2E9C46' }}>{msg.t}</span>}
      </div>
    </div>
  );
}

const inp = { width: '100%', background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 10, padding: '10px 13px', fontSize: 13.5, fontFamily: 'Manrope', outline: 'none', color: '#211A0E' };
const Field = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#85775D', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 7 }}>{label}</div>
    {children}
  </div>
);
