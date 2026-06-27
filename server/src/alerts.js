// Data-driven alert centre. Each alert is recomputed from the live aggregates so
// the metrics always reflect the current dataset; copy/steps/owners are the
// playbook templates from the design.
const fmt1 = (n) => (Number(n) || 0).toFixed(1).replace('.', ',');
const fmtVND = (n) => {
  n = +n || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' tr';
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return '' + Math.round(n);
};

export function buildAlerts(db, { total, koc, hours }) {
  const alerts = [];
  const top = koc[0] || {};
  const topShare = total.gmv ? (top.gmv / total.gmv) * 100 : 0;

  // 1 — concentration risk on the #1 KOC
  alerts.push({
    id: 0, sev: topShare >= 35 ? 'Cao' : 'Vừa', cat: 'risk',
    sc: topShare >= 35 ? '#E2502F' : '#BE8A14',
    bg: topShare >= 35 ? '#FBE9E2' : '#FBF0DA', bd: topShare >= 35 ? '#F8D8CD' : '#E6D2A4',
    time: '2 giờ trước', title: 'Phụ thuộc KOC chủ lực', metric: fmt1(topShare) + '% GMV',
    desc: `${top.name} đóng góp ${fmt1(topShare)}% GMV toàn kỳ. Rủi ro tập trung cao — nên phát triển thêm 3–5 KOC nhóm A để cân bằng danh mục.`,
    act: 'Xem kế hoạch mở rộng', owner: 'Trưởng nhóm KOC',
    steps: ['Xác định 5 KOC nhóm B có CVR > 4% để nâng cấp',
            'Phân bổ lại ngân sách booking giảm phụ thuộc top 1',
            'Đặt mục tiêu top-1 ≤ 25% GMV trong 60 ngày']
  });

  // 2 — sessions that produced zero orders
  const zero = total.sessions - total.withOrder;
  const zeroPct = total.sessions ? (zero / total.sessions) * 100 : 0;
  const dCount = koc.filter((k) => k.grade === 'D').length;
  alerts.push({
    id: 1, sev: zeroPct >= 70 ? 'Cao' : 'Vừa', cat: 'opportunity',
    sc: zeroPct >= 70 ? '#E2502F' : '#BE8A14',
    bg: zeroPct >= 70 ? '#FBE9E2' : '#FBF0DA', bd: zeroPct >= 70 ? '#F8D8CD' : '#E6D2A4',
    time: '5 giờ trước', title: `${fmt1(zeroPct)}% phiên không ra đơn`,
    metric: zero.toLocaleString('vi-VN') + ' phiên',
    desc: `${zero.toLocaleString('vi-VN')}/${total.sessions.toLocaleString('vi-VN')} phiên có 0 đơn, chủ yếu từ nhóm D (${dCount} KOC). Cần rà soát kịch bản, sản phẩm & khung giờ phát.`,
    act: 'Lọc phiên 0 đơn', owner: 'Vận hành',
    steps: ['Lọc danh sách KOC nhóm D có ≥ 3 phiên 0 đơn',
            'Rà soát sản phẩm gắn giỏ & khung giờ live',
            'Thử nghiệm lại với sản phẩm best-seller']
  });

  // 3 — high live hours but weak revenue/hour (among KOC that did sell)
  const slow = [...koc].filter((k) => k.hours >= 100 && k.gmv > 0).sort((a, b) => a.dtgio - b.dtgio)[0];
  if (slow) {
    alerts.push({
      id: 2, sev: 'Vừa', cat: 'optimize', sc: '#BE8A14', bg: '#FBF0DA', bd: '#E6D2A4',
      time: 'Hôm qua', title: 'Giờ live cao – chuyển đổi thấp', metric: fmtVND(slow.dtgio) + ' / giờ',
      desc: `${slow.name} đạt ${fmt1(slow.hours)}h live nhưng DT/giờ chỉ ${fmtVND(slow.dtgio)}. Cần tối ưu sản phẩm & ưu tiên khung giờ vàng.`,
      act: 'Mở hồ sơ KOC', owner: 'Vận hành', kocId: slow.id,
      steps: ['Chuyển phiên sang khung 19h–21h',
              'Thay sản phẩm sang nhóm CVR cao',
              'Rút ngắn thời lượng, tăng tần suất chốt']
    });
  }

  // 4 — weak conversion time band
  const worst = [...hours].filter((h) => h.w + h.n >= 30)
    .map((h) => ({ ...h, rate: h.w / Math.max(1, h.w + h.n) }))
    .sort((a, b) => a.rate - b.rate)[0];
  if (worst) {
    const hr = (x) => (x < 10 ? '0' + x : x) + 'h';
    alerts.push({
      id: 3, sev: 'Vừa', cat: 'optimize', sc: '#BE8A14', bg: '#FBF0DA', bd: '#E6D2A4',
      time: 'Hôm qua', title: `Khung ${hr(worst.h)} kém hiệu quả`, metric: '<' + Math.ceil(worst.rate * 100) + '% ra đơn',
      desc: `Tỷ lệ ra đơn quanh khung ${hr(worst.h)} chỉ ~${fmt1(worst.rate * 100)}%. Cân nhắc dồn lực sang khung 7h & 19h vốn cho ra đơn cao nhất.`,
      act: 'Xem khung giờ', owner: 'Điều phối lịch',
      steps: [`Giảm số phiên khung ${hr(worst.h)}`, 'Dồn KOC mạnh vào khung 7h & 19h', 'Theo dõi 2 tuần & đánh giá lại']
    });
  }

  // 5 — standout CVR worth replicating
  const best = [...koc].filter((k) => k.orders >= 200).sort((a, b) => b.cvr - a.cvr)[0];
  if (best) {
    alerts.push({
      id: 4, sev: 'Tốt', cat: 'positive', sc: '#2E9C46', bg: '#EEF3DF', bd: '#D4E2B8',
      time: '2 ngày trước', title: 'CVR vượt trội đáng nhân rộng', metric: 'CVR ' + fmt1(best.cvr) + '%',
      desc: `${best.name} đạt CVR ${fmt1(best.cvr)}% — thuộc nhóm cao nhất hệ thống. Phân tích & nhân rộng kịch bản cho nhóm KOC tương đồng.`,
      act: 'Phân tích kịch bản', owner: 'Đào tạo KOC', kocId: best.id,
      steps: ['Ghi nhận kịch bản & sản phẩm phiên CVR cao',
              'Chia sẻ playbook cho 10 KOC nhóm A/B',
              'Đặt CVR mục tiêu 5% cho nhóm áp dụng']
    });
  }

  const sevCount = (s) => alerts.filter((a) => a.sev === s).length;
  const summary = [
    { l: 'Mức cao', n: sevCount('Cao'), c: '#E2502F' },
    { l: 'Mức vừa', n: sevCount('Vừa'), c: '#BE8A14' },
    { l: 'Tích cực', n: sevCount('Tốt'), c: '#2E9C46' },
    { l: 'Đang theo dõi', n: Math.max(0, koc.filter((k) => k.grade === 'C').length), c: '#9C8F75' }
  ];

  return { items: alerts, summary };
}
