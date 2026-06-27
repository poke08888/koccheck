import React, { useEffect, useState } from 'react';
import { fetchAudit } from '../api.js';

const ACTION = {
  login:          { l: 'Đăng nhập',        c: '#9C8F75' },
  upload:         { l: 'Tải dữ liệu',      c: '#2E9C46' },
  delete_dataset: { l: 'Xoá dữ liệu',      c: '#E2502F' },
  create_user:    { l: 'Tạo user',         c: '#F47B27' },
  delete_user:    { l: 'Xoá user',         c: '#E2502F' },
  change_password:{ l: 'Đổi mật khẩu',     c: '#BE8A14' },
  reset_password: { l: 'Đặt lại mật khẩu', c: '#BE8A14' },
  update_role:    { l: 'Đổi vai trò',      c: '#F47B27' },
  update_weights: { l: 'Đổi trọng số',     c: '#BE8A14' },
  update_thresholds: { l: 'Đổi ngưỡng',    c: '#BE8A14' }
};

function fmtTs(ts) {
  try {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  } catch { return ts; }
}

export default function AuditLog() {
  const [entries, setEntries] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { fetchAudit(300).then((r) => setEntries(r.entries)).catch((e) => setErr(e.message)); }, []);

  const GT = '150px 150px 150px 1fr';
  return (
    <div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GT, padding: '13px 18px', borderBottom: '1px solid #E7DDCA', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', color: '#9C8F75', textTransform: 'uppercase' }}>
          <div>Thời gian</div><div>Người dùng</div><div>Hành động</div><div>Chi tiết</div>
        </div>
        {entries === null && !err && <div style={{ padding: 18, fontSize: 13, color: '#9C8F75' }}>Đang tải…</div>}
        {err && <div style={{ padding: 18, fontSize: 13, color: '#E2502F' }}>Lỗi: {err}</div>}
        {entries && entries.length === 0 && <div style={{ padding: 18, fontSize: 13, color: '#9C8F75' }}>Chưa có thao tác nào được ghi nhận.</div>}
        {entries && entries.map((e) => {
          const a = ACTION[e.action] || { l: e.action, c: '#9C8F75' };
          return (
            <div key={e.id} className="row" style={{ display: 'grid', gridTemplateColumns: GT, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #ECE3D2' }}>
              <div className="num" style={{ fontSize: 12.5, color: '#6C5E45' }}>{fmtTs(e.ts)}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#211A0E' }}>@{e.username || '—'}</div>
              <div><span style={{ fontSize: 11, fontWeight: 700, color: a.c, background: a.c + '1c', border: `1px solid ${a.c}55`, padding: '2px 9px', borderRadius: 99 }}>{a.l}</span></div>
              <div style={{ fontSize: 13, color: '#6C5E45' }}>{e.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
