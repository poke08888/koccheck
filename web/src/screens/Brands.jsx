import React, { useEffect, useState, useCallback } from 'react';
import { listBrands, createBrand, updateBrand, deleteBrand } from '../api.js';
import { fmtInt } from '../format.js';

const PLANS = ['Starter', 'Growth', 'Pro', 'Enterprise'];

const PLAN_COLORS = {
  Starter:    { bg: '#F4ECDB', color: '#BE8A14', border: '#E0D1AE' },
  Growth:     { bg: '#E8F4EB', color: '#2E9C46', border: '#C3DFC9' },
  Pro:        { bg: '#EAF0FB', color: '#3B6FD0', border: '#C3D3EF' },
  Enterprise: { bg: '#FAE9E4', color: '#E2502F', border: '#F0C8BA' },
};

function PlanBadge({ plan }) {
  const c = PLAN_COLORS[plan] || PLAN_COLORS.Growth;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.color, border: `1px solid ${c.border}`, letterSpacing: '.04em' }}>
      {plan}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(33,26,14,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FBF7EF', border: '1px solid #E1D6C0', borderRadius: 18, padding: '28px 32px', width: 440, boxShadow: '0 24px 60px rgba(40,30,16,.28)', animation: 'fadeUp .18s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 17 }}>{title}</div>
          <button onClick={onClose} style={{ background: '#F4ECDB', border: '1px solid #DBCEB5', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#85775D', fontSize: 16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BrandForm({ initial, onSave, onCancel, loading }) {
  const [name, setName] = useState(initial?.name || '');
  const [plan, setPlan] = useState(initial?.plan || 'Growth');
  const [err, setErr]   = useState('');

  const submit = async () => {
    if (!name.trim()) { setErr('Tên brand không được để trống'); return; }
    setErr('');
    await onSave(name.trim(), plan);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#85775D', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>TÊN BRAND</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Ví dụ: Macaron Cos"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${err ? '#E2502F' : '#DBCEB5'}`, background: '#FDF9F2', fontSize: 14, fontWeight: 600, color: '#211A0E', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#85775D', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>GÓI DỊCH VỤ</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PLANS.map((p) => {
            const c = PLAN_COLORS[p];
            const active = plan === p;
            return (
              <button key={p} onClick={() => setPlan(p)}
                style={{ padding: '7px 16px', borderRadius: 9, border: `1.5px solid ${active ? c.color : '#DBCEB5'}`, background: active ? c.bg : 'transparent', color: active ? c.color : '#85775D', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .12s', fontFamily: 'inherit' }}>
                {p}
              </button>
            );
          })}
        </div>
      </div>
      {err && <div style={{ color: '#E2502F', fontSize: 13, marginBottom: 14, fontWeight: 600 }}>⚠ {err}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #DBCEB5', background: '#F4ECDB', color: '#85775D', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Huỷ</button>
        <button onClick={submit} disabled={loading}
          style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: loading ? '#F0C898' : '#F47B27', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
          {loading ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ brand, onConfirm, onCancel, loading }) {
  return (
    <div>
      <div style={{ fontSize: 14, color: '#574C39', lineHeight: 1.6, marginBottom: 22 }}>
        Bạn chắc chắn muốn xoá brand <strong style={{ color: '#211A0E' }}>"{brand.name}"</strong>?<br />
        <span style={{ color: '#9C8F75', fontSize: 13 }}>Hành động này không thể hoàn tác.</span>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #DBCEB5', background: '#F4ECDB', color: '#85775D', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Huỷ</button>
        <button onClick={onConfirm} disabled={loading}
          style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: loading ? '#F0A898' : '#E2502F', color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
          {loading ? 'Đang xoá…' : 'Xoá brand'}
        </button>
      </div>
    </div>
  );
}

export default function Brands({ user, reload: reloadDashboard }) {
  const isAdmin = user?.role === 'admin';
  const [brands,   setBrands]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null); // { msg, ok }
  const [modal,    setModal]    = useState(null); // 'create' | { edit: brand } | { del: brand }
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listBrands();
      setBrands(r.brands || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const handleCreate = async (name, plan) => {
    setSaving(true);
    try {
      await createBrand(name, plan);
      setModal(null);
      showToast(`✓ Đã tạo brand "${name}"`);
      await load();
      reloadDashboard?.();
    } catch (e) {
      showToast('⚠ ' + e.message, false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (name, plan) => {
    const id = modal.edit.id;
    setSaving(true);
    try {
      await updateBrand(id, name, plan);
      setModal(null);
      showToast(`✓ Đã cập nhật brand "${name}"`);
      await load();
      reloadDashboard?.();
    } catch (e) {
      showToast('⚠ ' + e.message, false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const brand = modal.del;
    setSaving(true);
    try {
      await deleteBrand(brand.id);
      setModal(null);
      showToast(`✓ Đã xoá brand "${brand.name}"`);
      await load();
      reloadDashboard?.();
    } catch (e) {
      showToast('⚠ ' + e.message, false);
    } finally {
      setSaving(false);
    }
  };

  const totalSessions = brands.reduce((s, b) => s + (b.sessions || 0), 0);
  const totalKocs     = brands.reduce((s, b) => s + (b.kocs || 0), 0);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 28, zIndex: 200, background: toast.ok ? '#211A0E' : '#FAE9E4', color: toast.ok ? '#FBF7EF' : '#E2502F', border: `1px solid ${toast.ok ? '#3A3020' : '#F0C8BA'}`, borderRadius: 12, padding: '12px 20px', fontSize: 14, fontWeight: 700, boxShadow: '0 8px 24px rgba(40,30,16,.22)', animation: 'fadeUp .2s ease', maxWidth: 360 }}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {modal === 'create' && (
        <Modal title="Thêm brand mới" onClose={() => setModal(null)}>
          <BrandForm onSave={handleCreate} onCancel={() => setModal(null)} loading={saving} />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Chỉnh sửa brand" onClose={() => setModal(null)}>
          <BrandForm initial={modal.edit} onSave={handleUpdate} onCancel={() => setModal(null)} loading={saving} />
        </Modal>
      )}
      {modal?.del && (
        <Modal title="Xoá brand" onClose={() => setModal(null)}>
          <ConfirmDelete brand={modal.del} onConfirm={handleDelete} onCancel={() => setModal(null)} loading={saving} />
        </Modal>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: '#9C8F75' }}>
            {brands.length} brand · {fmtInt(totalSessions)} phiên · {fmtInt(totalKocs)} KOC
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('create')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 11, border: 'none', background: '#F47B27', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(226,100,28,.30)', transition: 'all .15s', fontFamily: 'inherit' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e06a1a'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#F47B27'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Thêm brand
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Tổng brand', value: brands.length, color: '#F47B27', icon: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' },
          { label: 'Tổng phiên live', value: fmtInt(totalSessions), color: '#BE8A14', icon: 'M23 7l-7 5 7 5V7z M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z' },
          { label: 'KOC hoạt động', value: fmtInt(totalKocs), color: '#2E9C46', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {icon.split(' M').map((p, i) => <path key={i} d={(i === 0 ? '' : 'M') + p} />)}
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#211A0E', fontFamily: "'Space Grotesk'", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: '#9C8F75', marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 16, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 180px 120px', gap: 0, padding: '12px 20px', borderBottom: '1px solid #E7DDCA', background: '#F4ECDB' }}>
          {['Tên Brand', 'Gói', 'Phiên Live', 'KOC', 'Khoảng ngày', isAdmin ? 'Thao tác' : ''].map((h, i) => (
            <div key={i} style={{ fontSize: 11, fontWeight: 700, color: '#9C8F75', letterSpacing: '.08em', textAlign: i >= 2 && i <= 3 ? 'center' : 'left' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9C8F75', fontSize: 14 }}>Đang tải…</div>
        ) : brands.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏷️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#574C39', marginBottom: 6 }}>Chưa có brand nào</div>
            <div style={{ fontSize: 13, color: '#9C8F75' }}>Tải dữ liệu lên hoặc thêm brand mới để bắt đầu.</div>
          </div>
        ) : brands.map((b, idx) => {
          const dateLabel = b.date_from && b.date_to
            ? fmtDay(b.date_from) + ' – ' + fmtDay(b.date_to)
            : b.date_from ? fmtDay(b.date_from) : '—';
          return (
            <div key={b.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 180px 120px', gap: 0, padding: '16px 20px', borderBottom: idx < brands.length - 1 ? '1px solid #EDE6D8' : 'none', alignItems: 'center', transition: 'background .12s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F8F3E8'}
              onMouseLeave={(e) => e.currentTarget.style.background = ''}>
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#F47B27,#BE8A14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                  {b.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#211A0E' }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: '#9C8F75' }}>ID #{b.id}</div>
                </div>
              </div>
              {/* Plan */}
              <div><PlanBadge plan={b.plan || 'Growth'} /></div>
              {/* Sessions */}
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#473D2D' }}>{fmtInt(b.sessions || 0)}</div>
              {/* KOCs */}
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#473D2D' }}>{fmtInt(b.kocs || 0)}</div>
              {/* Date range */}
              <div style={{ fontSize: 12.5, color: '#85775D', fontWeight: 600 }}>{dateLabel}</div>
              {/* Actions (admin only) */}
              <div style={{ display: 'flex', gap: 8 }}>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setModal({ edit: b })}
                      title="Sửa brand"
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #DBCEB5', background: '#F4ECDB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BE8A14', transition: 'all .12s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#EAD8B0'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#F4ECDB'; }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      onClick={() => setModal({ del: b })}
                      title="Xoá brand"
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #F0C8BA', background: '#FAE9E4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E2502F', transition: 'all .12s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F5D0C4'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#FAE9E4'; }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin notice */}
      {!isAdmin && brands.length > 0 && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#F4ECDB', border: '1px solid #E0D1AE', borderRadius: 10, fontSize: 13, color: '#85775D', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BE8A14" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          Chỉ quản trị viên mới có thể thêm, sửa hoặc xoá brand.
        </div>
      )}
    </div>
  );
}

function fmtDay(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
