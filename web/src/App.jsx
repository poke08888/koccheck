import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { fetchDashboard, me, getToken, logout as apiLogout, setUnauthorizedHandler } from './api.js';
import Login from './screens/Login.jsx';
import Overview from './screens/Overview.jsx';
import KocList from './screens/KocList.jsx';
import KocDetail from './screens/KocDetail.jsx';
import Compare from './screens/Compare.jsx';
import Sessions from './screens/Sessions.jsx';
import Alerts from './screens/Alerts.jsx';
import Products from './screens/Products.jsx';
import DataSources from './screens/DataSources.jsx';
import Settings from './screens/Settings.jsx';
import AuditLog from './screens/AuditLog.jsx';
import Brands from './screens/Brands.jsx';

const TITLES = {
  overview: ['Tổng quan hiệu suất', 'Bức tranh toàn cảnh KOC livestream theo bộ lọc toàn cục'],
  koc: ['Danh sách KOC', '598 nhà sáng tạo · xếp hạng, chấm điểm & lọc nhanh'],
  compare: ['So sánh KOC', 'Đối chiếu hiệu suất nhiều nhà sáng tạo song song'],
  sessions: ['Lịch sử phiên Live', '4.176 phiên đã thực hiện · 01/04 – 15/04/2026'],
  alerts: ['Trung tâm cảnh báo', 'Tự động phát hiện bất thường & cơ hội tối ưu'],
  products: ['Sản phẩm bán chạy', 'Theo dõi SKU theo GMV, đơn & tồn vận hành'],
  data: ['Nguồn dữ liệu', 'Tải lên & quản lý dữ liệu LIVE từ TikTok Shop'],
  settings: ['Cấu hình hệ thống', 'Ngưỡng cảnh báo, công thức chấm điểm & phân quyền'],
  detail: ['Hồ sơ KOC', 'Phân tích sâu hiệu suất & năng lực cá nhân'],
  audit: ['Nhật ký thao tác', 'Ai đã làm gì, lúc nào — upload, xoá, đăng nhập, quản lý người dùng'],
  brands: ['Quản lý Brand', 'Thêm, sửa, xoá brand · phân tích theo từng nhãn hàng'],
};

const NAV1 = [
  ['overview', 'Tổng quan', 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z'],
  ['koc', 'Danh sách KOC', 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75'],
  ['compare', 'So sánh KOC', 'M3 3v18h18 M7 16l3-4 3 3 5-7'],
  ['sessions', 'Phiên Live', 'M23 7l-7 5 7 5V7z M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z'],
  ['alerts', 'Cảnh báo', 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0']
];
const NAV2 = [
  ['products', 'Sản phẩm', 'M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.3 7L12 12l8.7-5 M12 22V12'],
  ['data', 'Nguồn dữ liệu', 'M12 2a9 3 0 0 0 0 6 9 3 0 0 0 0-6 M3 5v14a9 3 0 0 0 18 0V5 M3 12a9 3 0 0 0 18 0'],
  ['brands', 'Brands', 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01', 'admin'],
  ['audit', 'Nhật ký', 'M12 8v4l3 2 M21 12a9 9 0 1 1-9-9 M21 3v6h-6', 'admin'],
  ['settings', 'Cấu hình', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z']
];

const INITIAL = {
  screen: 'overview', sortKey: 'gmv', sortDir: -1, q: '', kocIdx: 0, cmp: [0, 1, 3],
  range: 'Tất cả', brandOpen: false, brand: 'Tất cả Brand', alertFilter: 'all', alertOpen: 0,
  stackHover: -1, hourHover: -1, scHover: -1, barHover: -1, funnelHover: -1, donutHover: null,
  hoverDay: null, pickOpen: false, pickQ: '',
  // custom date picker state
  customFrom: null, customTo: null, pickStep: 'from', calMonth: null,
};

const Icon = ({ d, size = 18, stroke = 'currentColor', sw = 2, fill = 'none', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);

/* ---------- Date helpers ---------- */
function toISO(d) {
  if (!d) return null;
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fromISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function fmtDisplay(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// Compute from/to ISO strings from the selected range chip + data meta
function resolveRange(range, customFrom, customTo, metaFrom, metaTo) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = toISO;
  if (range === 'Hôm nay')   return { from: fmt(today),                              to: fmt(today) };
  if (range === 'Hôm qua')   { const d = new Date(today); d.setDate(d.getDate() - 1); return { from: fmt(d), to: fmt(d) }; }
  if (range === '7 Ngày')    { const d = new Date(today); d.setDate(d.getDate() - 6); return { from: fmt(d), to: fmt(today) }; }
  if (range === '30 Ngày')   { const d = new Date(today); d.setDate(d.getDate() - 29); return { from: fmt(d), to: fmt(today) }; }
  if (range === 'Tùy chỉnh') return { from: customFrom || null, to: customTo || null };
  // 'Tất cả' — no filter
  return { from: null, to: null };
}

/* ---------- Mini Calendar ---------- */
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS_VN = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

function buildCalDays(year, month) {
  const first = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

function CalendarPicker({ customFrom, customTo, pickStep, calMonth, onSelect, onClose }) {
  const ref = useRef();
  // Default calMonth to first day of current month if null
  const baseDate = calMonth ? fromISO(calMonth + '-01') : new Date();
  const [year, setYear]   = useState(baseDate.getFullYear());
  const [month, setMonth] = useState(baseDate.getMonth());

  const cells = buildCalDays(year, month);
  const fromD = fromISO(customFrom);
  const toD   = fromISO(customTo);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // close on outside click
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  const isFrom  = (d) => d && fromD && toISO(d) === toISO(fromD);
  const isTo    = (d) => d && toD   && toISO(d) === toISO(toD);
  const isInRange = (d) => {
    if (!d || !fromD || !toD) return false;
    return d > fromD && d < toD;
  };
  const isToday = (d) => d && toISO(d) === toISO(new Date());

  return (
    <div ref={ref} style={{ position: 'absolute', top: 46, right: 0, zIndex: 50, background: '#FBF7EF', border: '1px solid #DBCEB5', borderRadius: 16, padding: 18, width: 280, boxShadow: '0 20px 50px rgba(40,30,16,.25)', animation: 'fadeUp .15s ease' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['Từ ngày', 'Đến ngày'].map((lbl, i) => {
          const isActive = (i === 0 && pickStep === 'from') || (i === 1 && pickStep === 'to');
          const val = i === 0 ? customFrom : customTo;
          return (
            <div key={lbl} style={{ flex: 1, padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${isActive ? '#F47B27' : '#E1D6C0'}`, background: isActive ? '#FFF4EC' : '#F8F3E8', textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: isActive ? '#F47B27' : '#9C8F75', letterSpacing: '.06em' }}>{lbl}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#F47B27' : val ? '#211A0E' : '#C2B393', marginTop: 1 }}>{val ? fmtDisplay(val) : '—'}</div>
            </div>
          );
        })}
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prevMonth} style={{ background: '#F4ECDB', border: '1px solid #E1D6C0', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#85775D' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#211A0E' }}>{MONTHS_VN[month]} {year}</div>
        <button onClick={nextMonth} style={{ background: '#F4ECDB', border: '1px solid #E1D6C0', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#85775D' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Weekdays */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: '#C2B393', padding: '2px 0' }}>{w}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const from = isFrom(d), to = isTo(d), inRange = isInRange(d), today = isToday(d);
          const active = from || to;
          return (
            <div key={i} onClick={() => onSelect(d)}
              style={{
                textAlign: 'center', fontSize: 12.5, fontWeight: active ? 800 : inRange ? 600 : 500,
                padding: '5px 0', borderRadius: active ? 8 : inRange ? 0 : 6, cursor: 'pointer',
                background: active ? '#F47B27' : inRange ? '#FDEEDD' : 'transparent',
                color: active ? '#fff' : inRange ? '#BE6A10' : today ? '#F47B27' : '#211A0E',
                border: today && !active ? '1.5px solid #F47B2740' : '1.5px solid transparent',
                transition: 'all .1s',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#F4ECDB'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = inRange ? '#FDEEDD' : 'transparent'; }}>
              {d.getDate()}
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      {(customFrom || customTo) && (
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button onClick={() => onSelect(null)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: '1px solid #DBCEB5', background: '#F4ECDB', color: '#85775D', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
            Xoá chọn
          </button>
          {customFrom && customTo && (
            <button onClick={onClose}
              style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', background: '#F47B27', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              Áp dụng
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [S, setS] = useState(INITIAL);
  const [loading, setLoading] = useState(false);

  const set = (patch) => setS((s) => ({ ...s, ...patch }));
  const setFn = (fn) => setS((s) => ({ ...s, ...fn(s) }));

  // restore session on load
  useEffect(() => {
    setUnauthorizedHandler(() => { apiLogout(); setUser(null); setData(null); });
    if (!getToken()) { setAuthReady(true); return; }
    me().then((r) => setUser(r.user)).catch(() => apiLogout()).finally(() => setAuthReady(true));
  }, []);

  // Compute active date range from S.
  // For 'Tùy chỉnh': only apply when BOTH from & to are selected — prevents
  // mid-selection fetches that return partial/empty data and crash charts.
  const activeRange = useMemo(() => {
    if (S.range === 'Tùy chỉnh') {
      if (S.customFrom && S.customTo) return { from: S.customFrom, to: S.customTo };
      return { from: null, to: null }; // incomplete — treat as "all data"
    }
    return resolveRange(S.range, S.customFrom, S.customTo);
  }, [S.range, S.customFrom, S.customTo]);

  // Load dashboard data.
  const doFetch = useCallback(async (from, to, brand) => {
    setLoading(true);
    try {
      const d = await fetchDashboard(from || undefined, to || undefined, brand || undefined);
      setData(d);
      setErr(null);
    } catch (e) {
      if (e.message !== 'unauthorized') setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch whenever user logs in OR the active range changes OR S.brand changes.
  // Using a ref-based key comparison so we don't add `data` to deps
  // (that would create a circular loop: fetch → data changes → effect runs → fetch…).
  const prevRangeKey = useRef(null);
  useEffect(() => {
    if (!user) return;
    const key = `${activeRange.from}|${activeRange.to}|${S.brand || ''}`;
    if (prevRangeKey.current === key) return;
    prevRangeKey.current = key;
    doFetch(activeRange.from, activeRange.to, S.brand);
  }, [user, activeRange, S.brand, doFetch]);

  const reload = () => doFetch(activeRange.from, activeRange.to, S.brand);
  const doLogout = () => { apiLogout(); setUser(null); setData(null); setS(INITIAL); };

  const brands = useMemo(
    () => ['Tất cả Brand', ...(data?.meta?.brands?.map((b) => b.name) || [])],
    [data]
  );

  // Date display label for the header badge
  const dateLabel = useMemo(() => {
    if (S.range === 'Tất cả') {
      if (data?.meta?.dateFrom && data?.meta?.dateTo) {
        return `${fmtDisplay(data.meta.dateFrom)} — ${fmtDisplay(data.meta.dateTo)}`;
      }
      return 'Toàn bộ dữ liệu';
    }
    if (S.range === 'Tùy chỉnh') {
      if (S.customFrom && S.customTo) return `${fmtDisplay(S.customFrom)} — ${fmtDisplay(S.customTo)}`;
      if (S.customFrom) return `Từ ${fmtDisplay(S.customFrom)}`;
      if (S.customTo)   return `Đến ${fmtDisplay(S.customTo)}`;
      return 'Chọn ngày…';
    }
    if (activeRange.from && activeRange.to && activeRange.from === activeRange.to) {
      return fmtDisplay(activeRange.from);
    }
    if (activeRange.from && activeRange.to) {
      return `${fmtDisplay(activeRange.from)} — ${fmtDisplay(activeRange.to)}`;
    }
    return S.range;
  }, [S.range, S.customFrom, S.customTo, activeRange, data?.meta]);

  // Calendar picker: handle day selection
  const handleCalSelect = (d) => {
    if (!d) {
      // Clear selection
      set({ customFrom: null, customTo: null, pickStep: 'from' });
      return;
    }
    const iso = toISO(d);
    setS((s) => {
      if (s.pickStep === 'from') {
        // First click: set From, wait for To
        return { ...s, customFrom: iso, customTo: null, pickStep: 'to' };
      } else {
        // Second click: if To < From, treat as new From instead
        if (s.customFrom && iso < s.customFrom) {
          return { ...s, customFrom: iso, customTo: null, pickStep: 'to' };
        }
        // Both dates selected — close picker automatically
        return { ...s, customTo: iso, pickStep: 'from', pickOpen: false };
      }
    });
  };

  if (!authReady) return <Center>Đang tải…</Center>;
  if (!user) return <Login onLogin={setUser} />;
  if (err) return <Center>⚠️ Lỗi tải dữ liệu: {err}<br />Hãy chắc chắn backend đang chạy (cd server && npm start).</Center>;
  if (!data) return <Center>Đang tải dữ liệu LiveScope…</Center>;

  const [title, sub] = TITLES[S.screen] || TITLES.overview;
  const props = { data, S, set, setFn, reload, user };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: 1440, margin: '0 auto', background: '#F1EBDE', color: '#211A0E', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -180, left: 180, width: 680, height: 520, background: 'radial-gradient(circle,rgba(226,100,28,.12),transparent 70%)', pointerEvents: 'none', animation: 'flo 9s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: -120, right: 60, width: 520, height: 460, background: 'radial-gradient(circle,rgba(190,138,20,.10),transparent 70%)', pointerEvents: 'none' }} />

      {/* SIDEBAR */}
      <aside style={{ width: 248, flexShrink: 0, background: '#F1EBDE', borderRight: '1px solid #E7DDCA', display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px 22px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: '#F47B27', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(226,100,28,.32)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', lineHeight: 1 }}>LiveScope</div>
            <div style={{ fontSize: 11, color: '#9C8F75', marginTop: 2 }}>KOC Intelligence</div>
          </div>
        </div>

        <SideGroup label="PHÂN TÍCH" items={NAV1} S={S} set={set} user={user} />
        <SideGroup label="QUẢN LÝ" items={NAV2} S={S} set={set} user={user} />

        <div style={{ marginTop: 'auto', background: 'linear-gradient(135deg,#ECE3D2,#FBF7EF)', border: '1px solid #E1D6C0', borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#F47B27,#BE8A14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBF0DA', fontWeight: 800, fontSize: 13 }}>NL</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || 'Nonelab'}</div>
              <div style={{ fontSize: 11, color: '#9C8F75' }}>{user.role === 'admin' ? 'Quản trị' : 'Người xem'} · {data.total.kocActive} KOC</div>
            </div>
            <div onClick={doLogout} title="Đăng xuất" style={{ width: 28, height: 28, borderRadius: 8, background: '#F4ECDB', border: '1px solid #DBCEB5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#85775D', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 28px', borderBottom: '1px solid #E9DFCC' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 700, letterSpacing: '-.01em' }}>{title}</h1>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#BE8A14', background: '#F4ECDB', border: '1px solid #E0D1AE', padding: '3px 9px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: '#BE8A14', boxShadow: '0 0 8px #BE8A14' }} />
                {loading ? 'LOADING…' : 'LIVE'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#897B5F', marginTop: 3 }}>{sub}</div>
          </div>

          {/* brand dropdown */}
          <div style={{ position: 'relative' }}>
            <div onClick={() => setFn((s) => ({ brandOpen: !s.brandOpen }))} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 11, padding: '5px 6px 5px 12px', cursor: 'pointer' }}>
              <Icon d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="#F47B27" size={15} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#473D2D', paddingRight: 4 }}>{S.brand}</span>
              <Icon d="M6 9l6 6 6-6" stroke="#85775D" sw={2.2} size={14} />
            </div>
            {S.brandOpen && (
              <div style={{ position: 'absolute', top: 46, right: 0, width: 208, background: '#FBF7EF', border: '1px solid #DBCEB5', borderRadius: 13, padding: 6, zIndex: 30, boxShadow: '0 18px 40px rgba(40,30,16,.25)' }}>
                {brands.map((b) => (
                  <div key={b} className="navi" onClick={() => set({ brand: b, brandOpen: false })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: S.brand === b ? '#F47B27' : '#473D2D' }}>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* range chips */}
          <div style={{ display: 'flex', background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 11, padding: 3 }}>
            {['Tất cả', 'Hôm nay', 'Hôm qua', '7 Ngày', '30 Ngày', 'Tùy chỉnh'].map((r) => (
              <div key={r}
                onClick={() => set({ range: r, pickOpen: r === 'Tùy chỉnh' ? true : false })}
                style={{ fontSize: 12, fontWeight: 600, padding: '7px 11px', borderRadius: 8, cursor: 'pointer', color: S.range === r ? '#fff' : '#85775D', background: S.range === r ? '#F47B27' : 'transparent', transition: 'all .15s', whiteSpace: 'nowrap' }}>
                {r}
              </div>
            ))}
          </div>

          {/* date display + calendar picker */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => S.range === 'Tùy chỉnh' && set({ pickOpen: !S.pickOpen })}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FBF7EF', border: '1px solid #E7DDCA', borderRadius: 11, padding: '8px 12px', fontSize: 12.5, fontWeight: 600, color: '#6C5E45', cursor: S.range === 'Tùy chỉnh' ? 'pointer' : 'default', userSelect: 'none' }}>
              <Icon d="M3 4h18v18H3z|M16 2v4M8 2v4M3 10h18" stroke="#F47B27" size={15} />
              {dateLabel}
              {S.range === 'Tùy chỉnh' && (
                <Icon d="M6 9l6 6 6-6" stroke="#85775D" sw={2.2} size={13} />
              )}
            </div>
            {S.pickOpen && S.range === 'Tùy chỉnh' && (
              <CalendarPicker
                customFrom={S.customFrom}
                customTo={S.customTo}
                pickStep={S.pickStep}
                calMonth={S.calMonth}
                onSelect={handleCalSelect}
                onClose={() => set({ pickOpen: false })}
              />
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
          {S.screen === 'overview'  && <Overview {...props} />}
          {S.screen === 'koc'       && <KocList {...props} />}
          {S.screen === 'detail'    && <KocDetail {...props} />}
          {S.screen === 'compare'   && <Compare {...props} />}
          {S.screen === 'sessions'  && <Sessions {...props} />}
          {S.screen === 'alerts'    && <Alerts {...props} />}
          {S.screen === 'products'  && <Products {...props} />}
          {S.screen === 'data'      && <DataSources {...props} />}
          {S.screen === 'audit'     && <AuditLog {...props} />}
          {S.screen === 'settings'  && <Settings {...props} />}
          {S.screen === 'brands'    && <Brands user={user} reload={reload} />}
        </div>
      </main>
    </div>
  );
}

function SideGroup({ label, items, S, set, user }) {
  return (
    <>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', color: '#C2B393', padding: label === 'QUẢN LÝ' ? '18px 10px 8px' : '8px 10px 8px' }}>{label}</div>
      {items.filter(([, , , adminOnly]) => adminOnly !== 'admin' || user?.role === 'admin').map(([id, lbl, icon]) => {
        const a = S.screen === id || (id === 'koc' && S.screen === 'detail');
        return (
          <div key={id} className="navi" onClick={() => set({ screen: id })} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 11, cursor: 'pointer', color: a ? '#FFFFFF' : '#897B5F', background: a ? '#F47B27' : 'transparent', marginBottom: 3, fontWeight: a ? 700 : 600, fontSize: 14 }}>
            <Icon d={icon} size={18} />
            <span>{lbl}</span>
          </div>
        );
      })}
    </>
  );
}

const Center = ({ children }) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#6C5E45', fontSize: 15, padding: 40, lineHeight: 1.6 }}>{children}</div>
);

export { Icon };
