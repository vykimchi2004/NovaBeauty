import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

export default function PersonalCare() {
  const products = [
    { id: 401, name: 'Sữa tắm dịu nhẹ', desc: 'Hương thơm thanh mát', price: '149.000đ', image: image1 },
    { id: 402, name: 'Tẩy tế bào chết', desc: 'Mịn da', price: '179.000đ', image: image1 },
    { id: 403, name: 'Dưỡng thể ẩm mượt', desc: 'Da mềm mại', price: '199.000đ', image: image1 },
    { id: 404, name: 'Khử mùi cơ thể', desc: 'Khô thoáng', price: '129.000đ', image: image1 },
  ];

  return (
    <div className={cx('content')}>
      <h1 className={cx('title')}>Chăm sóc cơ thể</h1>
      <p className={cx('description')}>Sản phẩm chăm sóc cơ thể, tắm gội và dưỡng thể.</p>
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
