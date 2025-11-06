import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';

const cx = classNames.bind(styles);

export default function PersonalCare() {
  const products = [
    { id: 401, name: 'Sữa tắm dịu nhẹ', desc: 'Hương thơm thanh mát', price: '149.000đ', image: image1 },
    { id: 402, name: 'Tẩy tế bào chết', desc: 'Mịn da', price: '179.000đ', image: image1 },
    { id: 403, name: 'Dưỡng thể ẩm mượt', desc: 'Da mềm mại', price: '199.000đ', image: image1 },
    { id: 404, name: 'Khử mùi cơ thể', desc: 'Khô thoáng', price: '129.000đ', image: image1 },
  ];

  return (
    <div className={cx('makeup-page')}>
      <aside className={cx('sidebar')}>
        <h2 className={cx('filter-title')}>BỘ LỌC</h2>
        <div className={cx('filter-group')}>
          <h3>Giá sản phẩm</h3>
          <ul>
            <li><label><input type="checkbox" /> Dưới 150.000đ</label></li>
            <li><label><input type="checkbox" /> 150.000đ - 300.000đ</label></li>
            <li><label><input type="checkbox" /> 300.000đ - 500.000đ</label></li>
            <li><label><input type="checkbox" /> Trên 500.000đ</label></li>
          </ul>
        </div>

        <div className={cx('filter-group')}>
          <h3>Loại sản phẩm</h3>
          <input type="text" className={cx('filter-search')} placeholder="Tìm" />
          <ul>
            <li><label><input type="checkbox" /> Sữa tắm</label></li>
            <li><label><input type="checkbox" /> Tẩy tế bào chết</label></li>
            <li><label><input type="checkbox" /> Dưỡng thể</label></li>
            <li><label><input type="checkbox" /> Khử mùi</label></li>
          </ul>
          <button className={cx('see-more')}>Xem thêm</button>
        </div>
      </aside>

      <div className={cx('content')}>
        <h1 className={cx('title')}>Chăm sóc cơ thể</h1>
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
