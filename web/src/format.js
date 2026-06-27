// Presentation helpers — ported 1:1 from the design prototype so numbers and
// labels render identically.

export function fmtVND(n) {
  n = +n || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' tr';
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return '' + Math.round(n);
}

export function fmtNum(n) {
  n = +n || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace('.', ',') + 'K';
  return '' + Math.round(n);
}

export const fmtInt = (n) => Math.round(+n || 0).toLocaleString('vi-VN');

export function pct(a, b) {
  b = +b || 0;
  if (!b) return '0%';
  return ((a / b) * 100).toFixed(1).replace('.', ',') + '%';
}

export function fmtSec(s) {
  s = Math.round(+s || 0);
  const m = Math.floor(s / 60), r = s % 60;
  return m > 0 ? `${m}m ${r < 10 ? '0' + r : r}s` : `${s}s`;
}

export const fmtPct = (n, d = 2) => (Number(n) || 0).toFixed(d).replace('.', ',') + '%';
export const fmt1 = (n) => (Number(n) || 0).toFixed(1).replace('.', ',');

export function gradeColor(g) {
  return { S: '#F47B27', A: '#BE8A14', B: '#2E9C46', C: '#C2801A', D: '#9C8F75' }[g] || '#9C8F75';
}

// Strip exotic unicode (math-script, emoji) from display names.
export function clean(n) {
  return (
    (n || '')
      .replace(
        /[\u{1F000}-\u{1FAFF}\u{1D400}-\u{1D7FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{25A0}-\u{2BFF}\u{0E3F}‍]/gu,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim() || 'KOC'
  );
}

export function initials(n) {
  const m = (n || '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (m.slice(0, 2).map((w) => w[0]).join('') || 'K').toUpperCase();
}

// Catmull-Rom -> cubic bezier smoothing for line charts.
export function smooth(pts) {
  if (pts.length < 2) return '';
  let d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) +
      ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
  }
  return d;
}

export const durLabel = (min) => {
  const h = Math.floor((min || 0) / 60), m = Math.round((min || 0) % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};
