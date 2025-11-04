import React from 'react';
import classNames from 'classnames/bind';
import styles from './Promo.module.scss';
import image1 from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

function Promo() {
  const products = [
    {
      id: 1,
      name: 'CLUB CLIO',
      desc: '[KHUYẾN MÃI HOT] Phấn Nước Mịn Li, Che Phủ Lỗ Chân Lông Clio Kill Cover Mesh Blur',
      price: '479.000đ',
      oldPrice: '679.000đ',
      discount: '-29%',
    },
    {
      id: 2,
      name: 'AMUSE',
      desc: '[FLASH SALE] Son Thạch Bóng Thuần Chay Amuse Jel-Fit Tint 3.8g',
      price: '299.000đ',
      oldPrice: '399.000đ',
      discount: '-25%',
    },
    {
      id: 3,
      name: 'LANEIGE',
      desc: '[COMBO DEAL] Bộ Chăm Sóc Da Laneige Water Bank Set',
      price: '1.299.000đ',
      oldPrice: '1.599.000đ',
      discount: '-19%',
    },
    {
      id: 4,
      name: 'INNISFREE',
      desc: '[MEGA SALE] Kem Dưỡng Ẩm Innisfree Green Tea Seed Cream',
      price: '399.000đ',
      oldPrice: '599.000đ',
      discount: '-33%',
    },
    {
      id: 5,
      name: 'ETUDE HOUSE',
      desc: '[LIMITED TIME] Bảng Phấn Mắt Etude House Play Color Eyes',
      price: '199.000đ',
      oldPrice: '299.000đ',
      discount: '-33%',
    },
    {
      id: 6,
      name: 'THE FACE SHOP',
      desc: '[HOT DEAL] Serum Vitamin C The Face Shop Vitamin C Serum',
      price: '349.000đ',
      oldPrice: '499.000đ',
      discount: '-30%',
    },
  ];

  return (
    <div className={cx('promo-page')}>
      {/* --- Cột bên trái: Bộ lọc --- */}
      <aside className={cx('sidebar')}>
        <h2 className={cx('filter-title')}>BỘ LỌC</h2>

        {/* Nhóm lọc giá */}
        <div className={cx('filter-group')}>
          <h3>Giá sản phẩm</h3>
          <ul>
            <li>
              <label>
                <input type="checkbox" /> Dưới 500.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> 500.000đ - 1.000.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> 1.000.000đ - 1.500.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> 1.500.000đ - 2.000.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Trên 2.000.000đ
              </label>
            </li>
          </ul>
        </div>

        {/* Nhóm lọc loại khuyến mãi */}
        <div className={cx('filter-group')}>
          <h3>Loại khuyến mãi</h3>
          <input type="text" className={cx('filter-search')} placeholder="Tìm" />
          <ul>
            <li>
              <label>
                <input type="checkbox" /> Flash Sale (12)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Combo Deal (8)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Mega Sale (15)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Limited Time (6)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Hot Deal (10)
              </label>
            </li>
          </ul>
          <button className={cx('see-more')}>Xem thêm</button>
        </div>

        {/* Nhóm lọc thương hiệu */}
        <div className={cx('filter-group')}>
          <h3>Thương hiệu</h3>
          <ul>
            <li>
              <label>
                <input type="checkbox" /> Club Clio (8)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Amuse (12)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Laneige (6)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Innisfree (9)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Etude House (7)
              </label>
            </li>
          </ul>
          <button className={cx('see-more')}>Xem thêm</button>
        </div>
      </aside>

      {/* --- Cột bên phải: Sản phẩm --- */}
      <div className={cx('content')}>
        <h1 className={cx('title')}>Khuyến mãi hot</h1>

        <div className={cx('product-grid')}>
          {products.map((p) => (
            <div key={p.id} className={cx('product-card')}>
              <div className={cx('img-wrap')}>
                <img src={image1} alt={p.name} />
                <span className={cx('freeship')}>HOT DEAL</span>
              </div>
              <div className={cx('info')}>
                <h4>{p.name}</h4>
                <p className={cx('desc')}>{p.desc}</p>
                <div className={cx('price-section')}>
                  <span className={cx('price')}>{p.price}</span>
                  {p.oldPrice && <span className={cx('old-price')}>{p.oldPrice}</span>}
                  {p.discount && <span className={cx('discount')}>{p.discount}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default Promo;
