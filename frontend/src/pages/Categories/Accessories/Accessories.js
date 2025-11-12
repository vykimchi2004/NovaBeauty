import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';

const cx = classNames.bind(styles);

export default function Accessories() {
  const products = [
    { id: 101, name: 'Cọ trang điểm 01', desc: 'Bộ cọ mềm mịn', price: '199.000đ', image: image1 },
    { id: 102, name: 'Bông mút 02', desc: 'Tán nền mịn', price: '79.000đ', image: image1 },
    { id: 103, name: 'Gương gập 03', desc: 'Nhỏ gọn tiện lợi', price: '59.000đ', image: image1 },
    { id: 104, name: 'Kẹp mi 04', desc: 'Cong mi tự nhiên', price: '89.000đ', image: image1 },
  ];

  return (
    <div className={cx('makeup-page')}>
      <aside className={cx('sidebar')}>
        <h2 className={cx('filter-title')}>BỘ LỌC</h2>
        <div className={cx('filter-group')}>
          <h3>Giá sản phẩm</h3>
          <ul>
            <li><label><input type="checkbox" /> Dưới 100.000đ</label></li>
            <li><label><input type="checkbox" /> 100.000đ - 300.000đ</label></li>
            <li><label><input type="checkbox" /> 300.000đ - 500.000đ</label></li>
            <li><label><input type="checkbox" /> Trên 500.000đ</label></li>
          </ul>
        </div>

        <div className={cx('filter-group')}>
          <h3>Loại phụ kiện</h3>
          <input type="text" className={cx('filter-search')} placeholder="Tìm" />
          <ul>
            <li><label><input type="checkbox" /> Cọ trang điểm</label></li>
            <li><label><input type="checkbox" /> Bông mút</label></li>
            <li><label><input type="checkbox" /> Gương</label></li>
            <li><label><input type="checkbox" /> Kẹp mi</label></li>
          </ul>
          <button className={cx('see-more')}>Xem thêm</button>
        </div>
      </aside>

      <div className={cx('content')}>
        <h1 className={cx('title')}>Phụ kiện</h1>
        <div className={cx('product-grid')}>
          {products.map((p) => (
            <Link key={p.id} to={`/product/${p.id}`} className={cx('product-card')} onClick={() => scrollToTop()}>
              <div className={cx('img-wrap')}>
                <img src={p.image} alt={p.name} />
                <span className={cx('freeship')}>FREESHIP</span>
              </div>
              <div className={cx('info')}>
                <h4>{p.name}</h4>
                <p className={cx('desc')}>{p.desc}</p>
                <div className={cx('price-section')}>
                  <span className={cx('price')}>{p.price}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
