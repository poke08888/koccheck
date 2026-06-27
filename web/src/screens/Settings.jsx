import React, { useState } from 'react';
import { saveWeights } from '../api.js';
import UserManagement from './UserManagement.jsx';
import ChangePassword from './ChangePassword.jsx';
import ThresholdEditor from './ThresholdEditor.jsx';

export default function Settings({ data, reload, user }) {
  const [weights, setW] = useState(() => data.weights.map((w) => ({ ...w })));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const thresholds = data.thresholds;

  const total = weights.reduce((a, w) => a + (+w.v || 0), 0);
  const maxV = Math.max(1, ...weights.map((w) => w.v));
  const dirty = JSON.stringify(weights) !== JSON.stringify(data.weights);

  const bump = (key, delta) => setW((ws) => ws.map((w) => w.key === key ? { ...w, v: Math.max(0, Math.min(100, w.v + delta)) } : w));

  const onSave = async () => {
    setSaving(true); setMsg(null);
    try {
      await saveWeights(weights);
      await reload();
      setMsg('Đã lưu & chấm điểm lại toàn bộ KOC.');
    } catch (e) { setMsg('Lỗi: ' + e.message); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 920 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 18, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Công thức chấm điểm KOC</div>
            <div style={{ fontSize: 12.5, color: '#897B5F', marginBottom: 20 }}>Trọng số 5 trục (tổng = {total}). Điểm quyết định hạng S/A/B/C/D.</div>
          </div>
          <span className="num" style={{ fontSize: 12, fontWeight: 700, color: total === 100 ? '#2E9C46' : '#E2502F', background: (total === 100 ? '#EEF3DF' : '#FBE9E2'), border: `1px solid ${total === 100 ? '#D4E2B8' : '#F8D8CD'}`, padding: '4px 10px', borderRadius: 8 }}>{total}/100</span>
        </div>
        {weights.map((w) => (
          <div key={w.key} style={{ marginBottom: 17 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              <span style={{ color: '#473D2D' }}>{w.l}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Step onClick={() => bump(w.key, -5)}>–</Step>
                <span className="num" style={{ color: w.c, width: 38, textAlign: 'center' }}>{w.v}%</span>
                <Step onClick={() => bump(w.key, +5)}>+</Step>
              </span>
            </div>
            <div style={{ height: 7, background: '#ECE3D2', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: (w.v / maxV * 100) + '%', background: w.c, borderRadius: 99, transition: 'width .15s' }} /></div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <button onClick={onSave} disabled={!dirty || saving} style={{ background: dirty ? '#F47B27' : '#E7DDCA', color: dirty ? '#fff' : '#A89B80', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: dirty ? 'pointer' : 'default', fontFamily: 'Manrope' }}>
            {saving ? 'Đang chấm lại…' : 'Lưu & chấm điểm lại'}
          </button>
          {dirty && <button onClick={() => setW(data.weights.map((w) => ({ ...w })))} style={{ background: 'none', border: '1px solid #E7DDCA', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#85775D', cursor: 'pointer', fontFamily: 'Manrope' }}>Hoàn tác</button>}
          {msg && <span style={{ fontSize: 12.5, color: '#2E9C46', fontWeight: 600 }}>{msg}</span>}
        </div>
      </div>

      <ThresholdEditor thresholds={thresholds} reload={reload} editable={user?.role === 'admin'} />
    </div>
    <ChangePassword />
    {user?.role === 'admin' && <UserManagement currentUser={user} />}
    </div>
  );
}

const Step = ({ onClick, children }) => (
  <span onClick={onClick} style={{ width: 22, height: 22, borderRadius: 6, background: '#F4ECDB', border: '1px solid #DBCEB5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#85775D', fontSize: 14, fontWeight: 700, userSelect: 'none' }}>{children}</span>
);
