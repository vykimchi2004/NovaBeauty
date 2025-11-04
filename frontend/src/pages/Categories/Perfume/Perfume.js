import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

export default function Perfume() {
  const products = [
    { id: 301, name: 'Nước hoa hồng dịu nhẹ', desc: 'Thơm mát lâu', price: '1.299.000đ', image: image1 },
    { id: 302, name: 'Eau de Parfum 50ml', desc: 'Hương hoa cỏ', price: '1.599.000đ', image: image1 },
    { id: 303, name: 'Eau de Toilette 30ml', desc: 'Hương cam chanh', price: '899.000đ', image: image1 },
    { id: 304, name: 'Rollerball 10ml', desc: 'Nhỏ gọn', price: '399.000đ', image: image1 },
  ];

  return (
    <div className={cx('content')}>
      <h1 className={cx('title')}>Nước hoa</h1>
      <p className={cx('description')}>Cọ, dụng cụ trang điểm và phụ kiện hỗ trợ.</p>
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
