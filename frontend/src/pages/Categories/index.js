import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './index.module.scss';

const cx = classNames.bind(styles);

const categories = [
  { name: 'Trang điểm', to: '/makeup' },
  { name: 'Chăm sóc da', to: '/skincare' },
  { name: 'Chăm sóc cơ thể', to: '/personal-care' },
  { name: 'Chăm sóc tóc', to: '/haircare' },
  { name: 'Tool & Brushes', to: '/perfume' },
  { name: 'Phụ kiện', to: '/accessories' },
  { name: 'Khuyến mãi hot', to: '/promo' },
];

function Categories() {
  return (
    <section className={cx('container')}>
      <div className={cx('inner')}>
        <h1 className={cx('title')}>Danh mục sản phẩm</h1>
        <div className={cx('grid')}>
          {categories.map((c) => (
            <Link key={c.to} to={c.to} className={cx('card')}>
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Categories;
