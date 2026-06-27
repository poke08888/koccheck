import React from 'react';
import { fmtVND, fmtInt } from '../format.js';

export default function Products({ data }) {
  const prods = data.products;
  const pmax = Math.max(...prods.map((p) => p.g));
  const colOf = (c) => (c === 'Skincare' ? '#BE8A14' : c === 'Trang điểm' ? '#F47B27' : '#BE8A14');
  const GT = '44px 2.4fr 1fr 1.6fr 1fr 1fr 1fr';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#F7F2E8', border: '1px solid #DCCFB6', borderRadius: 12, padding: '11px 16px', marginBottom: 16, fontSize: 12.5, color: '#6C5E45' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F47B27" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
        <span><b style={{ color: '#F47B27' }}>Beta</b> · Cần kết nối nguồn dữ liệu sản phẩm (SKU) từ TikTok Shop để hiển thị số liệu thực — dưới đây là dữ liệu mẫu minh hoạ.</span>
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid #E7DDCA', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GT, padding: '13px 18px', borderBottom: '1px solid #E7DDCA', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', color: '#9C8F75', textTransform: 'uppercase' }}>
          <div>#</div><div>Sản phẩm</div><div>Nhóm</div><div style={{ textAlign: 'right' }}>GMV</div><div style={{ textAlign: 'right' }}>Đơn</div><div style={{ textAlign: 'right' }}>CTR</div><div style={{ textAlign: 'right' }}>Hoàn/Đổi</div>
        </div>
        {prods.map((p, i) => {
          const col = colOf(p.c);
          return (
            <div key={i} className="row" style={{ display: 'grid', gridTemplateColumns: GT, alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid #ECE3D2' }}>
              <div className="num" style={{ fontSize: 13, color: '#9C8F75', fontWeight: 700 }}>{i + 1}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg,${col}33,${col}11)`, border: `1px solid ${col}44`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></svg></div>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.n}</div>
              </div>
              <div><span style={{ fontSize: 11, fontWeight: 600, color: col, background: col + '1a', padding: '3px 9px', borderRadius: 99 }}>{p.c}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                <div style={{ width: 74, height: 6, background: '#ECE3D2', borderRadius: 99, overflow: 'hidden' }}><div style={{ height: '100%', width: (p.g / pmax * 100).toFixed(0) + '%', background: col }} /></div>
                <span className="num" style={{ fontSize: 13, fontWeight: 700, color: '#BE8A14', minWidth: 56, textAlign: 'right' }}>{fmtVND(p.g)}</span>
              </div>
              <div className="num" style={{ textAlign: 'right', fontSize: 13, color: '#BE8A14' }}>{fmtInt(p.o)}</div>
              <div className="num" style={{ textAlign: 'right', fontSize: 13, color: '#6C5E45' }}>{p.ctr}</div>
              <div className="num" style={{ textAlign: 'right', fontSize: 13, color: '#E2502F' }}>{p.ret}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
