import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';

const cx = classNames.bind(styles);

function Makeup() {

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
            <Link key={p.id} to={`/product/${p.id}`} className={cx('product-card')} onClick={() => scrollToTop()}>
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
