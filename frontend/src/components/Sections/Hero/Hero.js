import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Hero.module.scss';
import classNames from 'classnames/bind';
import { getActiveBanners } from '~/services/banner';
import banner1 from '../../../assets/images/banners/banner1.png';
import banner2 from '../../../assets/images/banners/banner2.png';
import banner3 from '../../../assets/images/banners/banner3.png';

const cx = classNames.bind(styles);

const Hero = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getActiveBanners();
        if (mounted) {
          // Filter only approved banners (status = true, pendingReview = false)
          const approvedBanners = (data || []).filter(
            (banner) => banner.status === true && banner.pendingReview === false && banner.imageUrl
          );
          // Sort by orderIndex
          approvedBanners.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
          setBanners(approvedBanners);
        }
      } catch (error) {
        console.error('[Hero] Error loading banners:', error);
        // Fallback to default banners on error
        if (mounted) {
          setBanners([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fallback to default banners if no approved banners
  const displayBanners =
    banners.length > 0
      ? banners
      : [
          { imageUrl: banner1, id: 'default-1', linkUrl: null },
          { imageUrl: banner2, id: 'default-2', linkUrl: null },
          { imageUrl: banner3, id: 'default-3', linkUrl: null },
        ];

  if (loading) {
    return (
      <div className={cx('heroWrapper')}>
        <div className={cx('loading')}>Đang tải...</div>
      </div>
    );
  }

  return (
    <div className={cx('heroWrapper')}>
      {displayBanners.map((banner, index) => {
        const bannerContent = (
          <div className={cx('banner')}>
            <img src={banner.imageUrl} alt={banner.title || `banner-${index + 1}`} />
          </div>
        );

        // If banner has linkUrl, wrap in Link
        if (banner.linkUrl) {
          return (
            <Link key={banner.id || index} to={banner.linkUrl} className={cx('bannerLink')}>
              {bannerContent}
            </Link>
          );
        }

        return (
          <div key={banner.id || index}>
            {bannerContent}
          </div>
        );
      })}
    </div>
  );
};

export default Hero;
