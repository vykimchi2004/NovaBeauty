import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';

const cx = classNames.bind(styles);

export default function HairCare() {
  const products = [
    { id: 201, name: 'Dầu gội mềm mượt', desc: 'Nuôi dưỡng tóc', price: '249.000đ', image: image1 },
    { id: 202, name: 'Dầu xả phục hồi', desc: 'Bóng mượt', price: '229.000đ', image: image1 },
    { id: 203, name: 'Tinh dầu dưỡng', desc: 'Giảm xơ rối', price: '299.000đ', image: image1 },
    { id: 204, name: 'Xịt bảo vệ nhiệt', desc: 'Chống hư tổn', price: '189.000đ', image: image1 },
  ];

  return (
    <div className={cx('makeup-page')}>
      <aside className={cx('sidebar')}>
        <h2 className={cx('filter-title')}>BỘ LỌC</h2>
        <div className={cx('filter-group')}>
          <h3>Giá sản phẩm</h3>
          <ul>
            <li><label><input type="checkbox" /> Dưới 200.000đ</label></li>
            <li><label><input type="checkbox" /> 200.000đ - 400.000đ</label></li>
            <li><label><input type="checkbox" /> 400.000đ - 700.000đ</label></li>
            <li><label><input type="checkbox" /> Trên 700.000đ</label></li>
          </ul>
        </div>

        <div className={cx('filter-group')}>
          <h3>Loại sản phẩm</h3>
          <input type="text" className={cx('filter-search')} placeholder="Tìm" />
          <ul>
            <li><label><input type="checkbox" /> Dầu gội</label></li>
            <li><label><input type="checkbox" /> Dầu xả</label></li>
            <li><label><input type="checkbox" /> Dưỡng tóc</label></li>
            <li><label><input type="checkbox" /> Xịt dưỡng/Chống nhiệt</label></li>
          </ul>
          <button className={cx('see-more')}>Xem thêm</button>
        </div>
      </aside>

      <div className={cx('content')}>
        <h1 className={cx('title')}>Chăm sóc tóc</h1>
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
