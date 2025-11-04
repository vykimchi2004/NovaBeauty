import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './FeaturedCategories.module.scss';
import sonmoi from '~/assets/images/products/sonmoi.png';

const cx = classNames.bind(styles);

const categories = [
  { id: 1, name: 'Son môi', to: '/makeup', img: sonmoi },
  { id: 2, name: 'Mặt nạ', to: '/skincare', img: sonmoi },
  { id: 3, name: 'Kem chống nắng', to: '/skincare', img: sonmoi },
  { id: 4, name: 'Tinh dầu dưỡng', to: '/perfume', img: sonmoi },
  { id: 5, name: 'Kem dưỡng da', to: '/skincare', img: sonmoi },
  { id: 6, name: 'Sữa dưỡng thể', to: '/personal-care', img: sonmoi },
];

function FeaturedCategories() {
  return (
    <section className={cx('container')} aria-labelledby="featured-categories-heading">
      <div className={cx('inner')}>
        <div className={cx('row')}>
          <div className={cx('intro')}>
            <h2 id="featured-categories-heading" className={cx('title')}>
              DANH MỤC HOT
            </h2>
            <Link to="/products" className={cx('cta')}>
              XEM NGAY
            </Link>
          </div>
          <div className={cx('grid')}>
            {categories.map((c) => (
              <Link key={c.id} to={c.to} className={cx('item')}>
                <div className={cx('thumb')}>
                  <img src={c.img} alt={c.name} />
                </div>
                <div className={cx('label')}>{c.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedCategories;
