import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

export default function Skincare() {
  const products = [
    { id: 501, name: 'Sữa rửa mặt', desc: 'Làm sạch dịu nhẹ', price: '159.000đ', image: image1 },
    { id: 502, name: 'Nước hoa hồng', desc: 'Cân bằng da', price: '179.000đ', image: image1 },
    { id: 503, name: 'Tinh chất dưỡng', desc: 'Phục hồi da', price: '349.000đ', image: image1 },
    { id: 504, name: 'Kem dưỡng ẩm', desc: 'Khóa ẩm', price: '269.000đ', image: image1 },
  ];

  return (
    <div className={cx('content')}>
      <h1 className={cx('title')}>Chăm sóc da</h1>
      <p className={cx('description')}>Sản phẩm chăm sóc da tốt nhất cho mọi loại da.</p>
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
