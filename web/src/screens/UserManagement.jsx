import React, { useEffect, useState } from 'react';
import { listUsers, createUser, deleteUser, resetUserPassword, updateUserRole } from '../api.js';

const ROLE_LABEL = { admin: 'Admin', leader: 'Leader', viewer: 'Người xem' };
const ROLE_DESC = {
  admin: 'Toàn quyền: xem, upload, xoá dữ liệu, quản lý người dùng',
  leader: 'Xem & upload dữ liệu',
  viewer: 'Chỉ xem'
};
const ROLE_COL = { admin: '#E2502F', leader: '#F47B27', viewer: '#9C8F75' };

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', name: '', role: 'viewer', password: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => listUsers().then((r) => setUsers(r.users)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await createUser(form);
      setForm({ username: '', name: '', role: 'viewer', password: '' });
      setMsg({ err: false, t: 'Đã tạo tài khoản.' });
      await load();
    } catch (e2) { setMsg({ err: true, t: 'Lỗi: ' + e2.message }); }
    setBusy(false);
  };

  const remove = async (u) => {
    if (!window.confirm(`Xoá tài khoản "${u.username}"?`)) return;
    try { await deleteUser(u.id); await load(); }
    catch (e) { setMsg({ err: true, t: 'Lỗi xoá: ' + e.message }); }
  };

  const changeRole = async (u, role) => {
    if (role === u.role) return;
    try { await updateUserRole(u.id, role); setMsg({ err: false, t: `Đã đổi vai trò @${u.username} → ${ROLE_LABEL[role]}.` }); await load(); }
    catch (e) { setMsg({ err: true, t: 'Lỗi: ' + e.message }); await load(); }
  };

  const resetPw = async (u) => {
    const pw = window.prompt(`Đặt mật khẩu mới cho "@${u.username}" (≥ 6 ký tự):`);
    if (!pw) return;
    try { await resetUserPassword(u.id, pw); setMsg({ err: false, t: `Đã đặt lại mật khẩu cho @${u.username}.` }); }
    catch (e) { setMsg({ err: true, t: 'Lỗi: ' + e.message }); }
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 18, padding: 22, marginTop: 16 }}>
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Quản lý người dùng</div>
      <div style={{ fontSize: 12.5, color: '#897B5F', marginBottom: 18 }}>Admin tạo tài khoản & gán quyền. Leader được upload, Người xem chỉ xem.</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 80px', gap: 10, padding: '0 4px 10px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', color: '#9C8F75', textTransform: 'uppercase', borderBottom: '1px solid #E7DDCA' }}>
        <div>Tài khoản</div><div>Tên</div><div>Vai trò</div><div />
      </div>
      {users.map((u) => (
        <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 80px', gap: 10, alignItems: 'center', padding: '11px 4px', borderBottom: '1px solid #ECE3D2' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#211A0E' }}>@{u.username}{u.id === currentUser.id && <span style={{ fontSize: 10.5, color: '#9C8F75', fontWeight: 500 }}> (bạn)</span>}</div>
          <div style={{ fontSize: 13, color: '#6C5E45' }}>{u.name}</div>
          <div>
            <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}
              style={{ fontSize: 12, fontWeight: 700, color: ROLE_COL[u.role], background: ROLE_COL[u.role] + '1c', border: `1px solid ${ROLE_COL[u.role]}55`, borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontFamily: 'Manrope', outline: 'none' }}>
              <option value="admin">Admin</option>
              <option value="leader">Leader</option>
              <option value="viewer">Người xem</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <div onClick={() => resetPw(u)} title="Đặt lại mật khẩu" className="lift" style={{ width: 30, height: 30, borderRadius: 8, background: '#F4ECDB', border: '1px solid #DBCEB5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#85775D' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.6 7.6a5 5 0 1 1-7.1 7.1 5 5 0 0 1 7.1-7.1zm0 0L15 8m0 0l3 3 3-3-3-3" /></svg>
            </div>
            {u.id !== currentUser.id && (
              <div onClick={() => remove(u)} title="Xoá" className="lift" style={{ width: 30, height: 30, borderRadius: 8, background: '#FBE9E2', border: '1px solid #F8D8CD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#E2502F' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </div>
            )}
          </div>
        </div>
      ))}

      <form onSubmit={add} style={{ marginTop: 18, background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#473D2D', marginBottom: 12 }}>Tạo tài khoản mới</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Tài khoản" style={inp} />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên hiển thị" style={inp} />
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mật khẩu" style={inp} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inp}>
            <option value="viewer">Người xem (chỉ xem)</option>
            <option value="leader">Leader (xem + upload)</option>
            <option value="admin">Admin (toàn quyền)</option>
          </select>
        </div>
        <div style={{ fontSize: 11.5, color: '#9C8F75', marginBottom: 12 }}>{ROLE_DESC[form.role]}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" disabled={busy} style={{ background: '#F47B27', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'Manrope', opacity: busy ? .7 : 1 }}>
            {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
          {msg && <span style={{ fontSize: 12.5, fontWeight: 600, color: msg.err ? '#E2502F' : '#2E9C46' }}>{msg.t}</span>}
        </div>
      </form>
    </div>
  );
}

const inp = { background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 10, padding: '10px 13px', fontSize: 13.5, fontFamily: 'Manrope', outline: 'none', color: '#211A0E' };
