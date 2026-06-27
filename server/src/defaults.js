// Default scoring weights / alert thresholds, shared by the seed script and the
// server's auto-bootstrap.
import { getSetting, setSetting } from './db.js';

export const DEFAULT_WEIGHTS = [
  { key: 'dtgio', l: 'Hiệu suất giờ (DT/giờ)', v: 30, c: '#BE8A14' },
  { key: 'cvr',   l: 'Tỷ lệ chuyển đổi (CVR)', v: 25, c: '#2E9C46' },
  { key: 'ctr',   l: 'Thu hút (CTR)',          v: 20, c: '#BE8A14' },
  { key: 'gmv',   l: 'Quy mô GMV',             v: 15, c: '#F47B27' },
  { key: 'reg',   l: 'Độ đều đặn (số phiên)',  v: 10, c: '#BE8A14' }
];

export const DEFAULT_THRESHOLDS = [
  { l: 'Phiên 0 đơn liên tiếp', d: 'Cảnh báo KOC tụt phong độ', v: '≥ 5 phiên', c: '#E2502F' },
  { l: 'CVR giảm so kỳ trước',  d: 'Theo dõi chất lượng phiên',  v: '> 30%',     c: '#BE8A14' },
  { l: 'DT/giờ dưới ngưỡng',    d: 'Hiệu suất thời gian kém',    v: '< 200K/h',  c: '#BE8A14' },
  { l: 'Tập trung 1 KOC',       d: 'Rủi ro phụ thuộc doanh thu', v: '> 35% GMV', c: '#E2502F' },
  { l: 'KOC mới nổi bật',       d: 'Cơ hội đầu tư mở rộng',      v: 'Top 20% điểm', c: '#2E9C46' }
];

// Set defaults only if missing (idempotent).
export async function ensureDefaults(db) {
  if (!(await getSetting('weights'))) await setSetting('weights', DEFAULT_WEIGHTS);
  if (!(await getSetting('thresholds'))) await setSetting('thresholds', DEFAULT_THRESHOLDS);
}
