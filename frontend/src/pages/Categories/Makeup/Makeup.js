import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

function Makeup() {
  const products = [
    {
      id: 1,
      brand: 'CLUB CLIO',
      name: 'Phấn Nước Mịn Li',
      desc: '[ĐỘC QUYỀN] Phấn Nước Mịn Li, Che Phủ Lỗ Chân Lông Clio Kill Cover Mesh Blur',
      price: '579.000đ',
      oldPrice: '679.000đ',
      discount: 15,
      reviews: 32,
      rating: 5,
      image: image1,
      volume: '15g',
    },
    {
      id: 2,
      brand: 'AMUSE',
      name: 'Son Thạch Bóng',
      desc: 'Son Thạch Bóng Thuần Chay Amuse Jel-Fit Tint',
      price: '339.000đ',
      oldPrice: '399.000đ',
      discount: 15,
      reviews: 21,
      rating: 4,
      image: image1,
      volume: '3.8g',
    },
    {
      id: 3,
      brand: 'AMUSE',
      name: 'Bảng Phấn Mắt',
      desc: 'Bảng Phấn Mắt 9 Ô Thuần Chay Amuse Eye Color Palette',
      price: '659.000đ',
      oldPrice: '',
      discount: '',
      reviews: 7,
      rating: 5,
      image: image1,
      volume: '11g',
    },
    {
      id: 4,
      brand: 'CLUB CLIO',
      name: 'Mascara Làm Cong Mi',
      desc: 'Mascara Chống Trôi Clio Kill Lash Superproof Mascara',
      price: '275.000đ',
      oldPrice: '339.000đ',
      discount: 19,
      reviews: 28,
      rating: 5,
      image: image1,
      volume: '7g',
    },
  ];

  return (
    <div className={cx('makeup-page')}>
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

        {/* Nhóm lọc loại sản phẩm */}
        <div className={cx('filter-group')}>
          <h3>Loại sản phẩm</h3>
          <input type="text" className={cx('filter-search')} placeholder="Tìm" />
          <ul>
            <li>
              <label>
                <input type="checkbox" /> Che khuyết điểm (14)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Chì kẻ mắt (14)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Chì kẻ mày (15)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Cọ trang điểm (16)
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Dưỡng môi (21)
              </label>
            </li>
          </ul>
          <button className={cx('see-more')}>Xem thêm</button>
        </div>
      </aside>

      {/* --- Cột bên phải: Sản phẩm --- */}
      <div className={cx('content')}>
        <h1 className={cx('title')}>Trang điểm</h1>

        <div className={cx('product-grid')}>
          {products.map((p) => (
            <Link key={p.id} to={`/product/${p.id}`} className={cx('product-card')}>
              <div className={cx('img-wrap')}>
                <img src={image1} alt={p.name} />
                <span className={cx('freeship')}>FREESHIP</span>
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
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
export default Makeup;
