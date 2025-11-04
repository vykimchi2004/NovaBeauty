import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

export default function HairCare() {
  const products = [
    { id: 201, name: 'Dầu gội mềm mượt', desc: 'Nuôi dưỡng tóc', price: '249.000đ', image: image1 },
    { id: 202, name: 'Dầu xả phục hồi', desc: 'Bóng mượt', price: '229.000đ', image: image1 },
    { id: 203, name: 'Tinh dầu dưỡng', desc: 'Giảm xơ rối', price: '299.000đ', image: image1 },
    { id: 204, name: 'Xịt bảo vệ nhiệt', desc: 'Chống hư tổn', price: '189.000đ', image: image1 },
  ];

  return (
    <div className={cx('content')}>
      <h1 className={cx('title')}>Chăm sóc tóc</h1>
      <p className={cx('description')}>Sản phẩm chăm sóc tóc.</p>
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
