import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Hero.module.scss';
import classNames from 'classnames/bind';
import { getActiveBanners } from '~/services/banner';
import { getActiveProducts } from '~/services/product';
import banner1 from '../../../assets/images/banners/banner1.png';
import banner2 from '../../../assets/images/banners/banner2.png';
import banner3 from '../../../assets/images/banners/banner3.png';

const cx = classNames.bind(styles);

const Hero = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productMeta, setProductMeta] = useState({ map: new Map(), total: 0 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [bannerRes, productRes] = await Promise.all([
          getActiveBanners(),
          getActiveProducts(),
        ]);
        if (mounted) {
          // Filter only active banners with an image
          const approvedBanners = (bannerRes || []).filter(
            (banner) => banner.status === true && !!banner.imageUrl && banner.isMagazine !== true
          );
          // Sort by orderIndex
          approvedBanners.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
          setBanners(approvedBanners);

          const productList = Array.isArray(productRes)
            ? productRes
            : productRes?.result && Array.isArray(productRes.result)
              ? productRes.result
              : [];
          const metaMap = new Map();
          productList.forEach((product) => {
            metaMap.set(product.id, {
              categoryId: product.categoryId || product.category?.id || null,
              brand: product.brand || '',
            });
          });
          setProductMeta({ map: metaMap, total: productList.length });
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
  const displayBanners = useMemo(
    () =>
      banners.length > 0
        ? banners
        : [
          { imageUrl: banner1, id: 'default-1', linkUrl: null },
          { imageUrl: banner2, id: 'default-2', linkUrl: null },
          { imageUrl: banner3, id: 'default-3', linkUrl: null },
        ],
    [banners],
  );

  const formatHeading = (rawHeading) => {
    if (!rawHeading) return '';
    return rawHeading.replace(/^banner\s+/i, '').trim();
  };

  const ensureHeadingParam = (url, heading) => {
    const cleanHeading = formatHeading(heading);
    if (!cleanHeading) return url;
    const [path, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    if (!params.has('heading')) {
      params.set('heading', cleanHeading);
    }
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const buildDerivedLink = (banner) => {
    if (banner.linkUrl) return ensureHeadingParam(banner.linkUrl, banner.title);

    const { map, total } = productMeta;
    const productIds = banner.productIds || [];

    if (total > 0 && productIds.length === total) {
      return ensureHeadingParam('/products', banner.title);
    }

    const metaList = productIds
      .map((id) => map.get(id))
      .filter(Boolean);

    if (metaList.length > 0) {
      const firstCategory = metaList[0].categoryId || null;
      const allSameCategory =
        firstCategory &&
        metaList.every((meta) => meta.categoryId === firstCategory);
      if (allSameCategory) {
        const params = new URLSearchParams({ category: firstCategory });
        if (banner.title) params.set('heading', banner.title);
        return `/products?${params.toString()}`;
      }

      const firstBrand = metaList[0].brand || '';
      const allSameBrand =
        firstBrand &&
        metaList.every((meta) => (meta.brand || '') === firstBrand);
      if (allSameBrand) {
        const params = new URLSearchParams({ brand: firstBrand });
        if (banner.title) params.set('heading', banner.title);
        return `/products?${params.toString()}`;
      }
    }

    if (productIds.length > 0) {
      const params = new URLSearchParams({ products: productIds.join(',') });
      if (banner.title) params.set('heading', banner.title);
      return `/promo?${params.toString()}`;
    }

    return ensureHeadingParam('/products', banner.title);
  };

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
        return (
          <Link
            key={banner.id || index}
            to={buildDerivedLink(banner)}
            className={cx('bannerLink')}
          >
            <div className={cx('banner')}>
              <img src={banner.imageUrl} alt={banner.title || `banner-${index + 1}`} />
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default Hero;
