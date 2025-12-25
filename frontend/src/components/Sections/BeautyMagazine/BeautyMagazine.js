import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './BeautyMagazine.module.scss';
import { getActiveBanners } from '~/services/banner';

const cx = classNames.bind(styles);

const BeautyMagazine = () => {
  const categories = [
    'Góc review',
    'Cách chăm sóc da',
    'Xu hướng trang điểm',
    'Sự kiện',
  ];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(categories[0]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const banners = await getActiveBanners();
        if (!mounted) return;

        // Filter for banners marked as magazine
        const mags = (banners || []).filter(
          (b) => b.isMagazine === true && b.status === true && !!b.imageUrl
        );

        setItems(mags);
      } catch (err) {
        console.error('[BeautyMagazine] failed to load magazines', err);
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => (mounted = false);
  }, []);

  const filteredItems = items.filter((it) => it.category === activeTab).slice(0, 3);

  if (loading) return null;

  const stripHtml = (html) => {
    return html?.replace(/<[^>]*>?/gm, '') || '';
  };

  return (
    <section className={cx('magazine')}>
      <div className={cx('header')}>
        <div className={cx('titleBlock')}>
          <h2>TẠP CHÍ LÀM ĐẸP</h2>
        </div>
        <div className={cx('categories')}>
          {categories.map((cat) => (
            <span
              key={cat}
              className={cx({ active: activeTab === cat })}
              onClick={() => setActiveTab(cat)}
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div className={cx('cards')}>
        {filteredItems.map((it) => (
          <article key={it.id} className={cx('card')}>
            <Link className={cx('thumb')} to={`/magazine/${it.id}`}>
              <div className={cx('imageWrap')}>
                <div className={cx('image')} style={{ backgroundImage: `url(${it.imageUrl})` }} />
                {it.category && <span className={cx('cardCategory')}>{it.category}</span>}
              </div>
            </Link>
            <div className={cx('body')}>
              <h3 className={cx('title')}>
                <Link to={`/magazine/${it.id}`}>{it.title}</Link>
              </h3>
              <p className={cx('desc')}>
                {stripHtml(it.description).length > 150
                  ? `${stripHtml(it.description).substring(0, 150)}...`
                  : stripHtml(it.description)}
              </p>
            </div>
          </article>
        ))}
        {filteredItems.length === 0 && (
          <div className={cx('emptyCategory')}>
            Chưa có bài viết nào trong mục này.
          </div>
        )}
      </div>

      <div className={cx('viewAllWrapper')}>
        <Link to="/magazines" className={cx('viewAllBtn')}>
          Tất cả bài viết
        </Link>
      </div>
    </section>
  );
};

export default BeautyMagazine;
