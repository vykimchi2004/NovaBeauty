import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';

const cx = classNames.bind(styles);

export default function Perfume() {
  const products = [
    { id: 301, name: 'Nước hoa hồng dịu nhẹ', desc: 'Thơm mát lâu', price: '1.299.000đ', image: image1 },
    { id: 302, name: 'Eau de Parfum 50ml', desc: 'Hương hoa cỏ', price: '1.599.000đ', image: image1 },
    { id: 303, name: 'Eau de Toilette 30ml', desc: 'Hương cam chanh', price: '899.000đ', image: image1 },
    { id: 304, name: 'Rollerball 10ml', desc: 'Nhỏ gọn', price: '399.000đ', image: image1 },
  ];

  return (
    <div className={cx('makeup-page')}>
      <aside className={cx('sidebar')}>
        <h2 className={cx('filter-title')}>BỘ LỌC</h2>
        <div className={cx('filter-group')}>
          <h3>Giá sản phẩm</h3>
          <ul>
            <li><label><input type="checkbox" /> Dưới 1.000.000đ</label></li>
            <li><label><input type="checkbox" /> 1.000.000đ - 2.000.000đ</label></li>
            <li><label><input type="checkbox" /> 2.000.000đ - 3.000.000đ</label></li>
            <li><label><input type="checkbox" /> Trên 3.000.000đ</label></li>
          </ul>
        </div>

        <div className={cx('filter-group')}>
          <h3>Nồng độ</h3>
          <input type="text" className={cx('filter-search')} placeholder="Tìm" />
          <ul>
            <li><label><input type="checkbox" /> Eau de Parfum</label></li>
            <li><label><input type="checkbox" /> Eau de Toilette</label></li>
            <li><label><input type="checkbox" /> Rollerball</label></li>
          </ul>
          <button className={cx('see-more')}>Xem thêm</button>
        </div>
      </aside>

      <div className={cx('content')}>
        <h1 className={cx('title')}>Nước hoa</h1>
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
