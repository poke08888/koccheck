import React, { useState } from 'react';
import { login, setToken } from '../api.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { token, user } = await login(username.trim(), password);
      setToken(token);
      onLogin(user);
    } catch (e2) {
      setErr(e2.message === 'unauthorized' ? 'Sai tài khoản hoặc mật khẩu' : e2.message);
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1EBDE', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -160, left: '30%', width: 680, height: 520, background: 'radial-gradient(circle,rgba(226,100,28,.14),transparent 70%)', pointerEvents: 'none', animation: 'flo 9s ease-in-out infinite' }} />
      <div style={{ width: 380, background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 20, padding: 32, boxShadow: '0 28px 70px rgba(40,30,16,.18)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#F47B27', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(226,100,28,.32)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 18, lineHeight: 1 }}>LiveScope</div>
            <div style={{ fontSize: 12, color: '#9C8F75', marginTop: 3 }}>KOC Intelligence</div>
          </div>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: '#211A0E', marginBottom: 4 }}>Đăng nhập</div>
        <div style={{ fontSize: 12.5, color: '#897B5F', marginBottom: 18 }}>Truy cập hệ thống báo cáo KOC livestream</div>

        <form onSubmit={submit}>
          <Field label="Tài khoản">
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus
              style={inp} placeholder="admin" />
          </Field>
          <Field label="Mật khẩu">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              style={inp} placeholder="••••••••" />
          </Field>
          {err && <div style={{ fontSize: 12.5, color: '#E2502F', fontWeight: 600, marginBottom: 12 }}>{err}</div>}
          <button type="submit" disabled={busy} style={{ width: '100%', background: '#F47B27', color: '#fff', border: 'none', borderRadius: 11, padding: '12px', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'Manrope', opacity: busy ? .7 : 1 }}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        <div style={{ fontSize: 11.5, color: '#A89B80', marginTop: 16, textAlign: 'center' }}>Mặc định: <b>admin / admin123</b> (đổi khi triển khai)</div>
      </div>
    </div>
  );
}

const inp = { width: '100%', background: '#F7F2E8', border: '1px solid #E7DDCA', borderRadius: 11, padding: '11px 14px', fontSize: 14, fontFamily: 'Manrope', outline: 'none', color: '#211A0E' };
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#85775D', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 7 }}>{label}</div>
    {children}
  </div>
);
