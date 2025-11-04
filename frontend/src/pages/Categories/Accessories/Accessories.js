import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

export default function Accessories() {
  const products = [
    { id: 101, name: 'Cọ trang điểm 01', desc: 'Bộ cọ mềm mịn', price: '199.000đ', image: image1 },
    { id: 102, name: 'Bông mút 02', desc: 'Tán nền mịn', price: '79.000đ', image: image1 },
    { id: 103, name: 'Gương gập 03', desc: 'Nhỏ gọn tiện lợi', price: '59.000đ', image: image1 },
    { id: 104, name: 'Kẹp mi 04', desc: 'Cong mi tự nhiên', price: '89.000đ', image: image1 },
  ];

  return (
    <div className={cx('content')}>
      <h1 className={cx('title')}>Phụ kiện</h1>
      <p className={cx('description')}>Phụ kiện bổ trợ làm đẹp.</p>
      <div className={cx('product-grid')}>
        {products.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className={cx('product-card')}>
            <div className={cx('img-wrap')}>
              <img src={p.image} alt={p.name} />
            </div>
            <div className={cx('info')}>
              <h4>{p.name}</h4>
              <p className={cx('desc')}>{p.desc}</p>
              <div className={cx('price')}>{p.price}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
