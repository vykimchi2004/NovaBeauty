import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './FeaturedCategories.module.scss';
import { getRootCategories } from '~/services/category';

const cx = classNames.bind(styles);

function FeaturedCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await getRootCategories();
        // Filter only active categories
        const activeCategories = (data || []).filter(cat => cat.status !== false);
        setCategories(activeCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

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
            {loading ? (
              <div className={cx('loading')}>Đang tải...</div>
            ) : categories.length === 0 ? (
              <div className={cx('empty')}>Chưa có danh mục nào</div>
            ) : (
              categories.slice(0, 7).map((c) => (
                <Link key={c.id} to={`/products?category=${c.id}`} className={cx('item')}>
                  <div className={cx('thumb')}>
                    <span className={cx('label')}>{c.name}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturedCategories;
