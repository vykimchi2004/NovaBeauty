import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './HotPromotions.module.scss';
import productImg from '../../../assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';
import { getActiveProducts } from '~/services/product';
import { getActivePromotions } from '~/services/promotion';

const cx = classNames.bind(styles);

function HotPromotions() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set());

  useEffect(() => {
    const fetchPromoProducts = async () => {
      try {
        setLoading(true);

        const data = await getActiveProducts();
        // Đảm bảo data là array
        const productsList = Array.isArray(data) ? data : (data?.result && Array.isArray(data.result) ? data.result : []);

        // Lọc các sản phẩm có promotion active (có promotionId, promotionName và discountValue > 0)
        const promoProducts = (productsList || []).filter(
          product => product &&
            product.id &&
            product.promotionId &&
            product.promotionName &&
            product.discountValue &&
            product.discountValue > 0 &&
            product.price &&
            product.price > 0 &&
            (product.price !== null && product.price !== undefined)
        );

        // Sắp xếp theo phần trăm giảm giá giảm dần (sản phẩm giảm giá nhiều nhất lên trước)
        promoProducts.sort((a, b) => {
          // Tính phần trăm giảm giá cho sản phẩm a
          const originalPriceA = (a.price || 0) + (a.discountValue || 0);
          const percentageA = originalPriceA > 0 ? ((a.discountValue || 0) / originalPriceA) * 100 : 0;
          
          // Tính phần trăm giảm giá cho sản phẩm b
          const originalPriceB = (b.price || 0) + (b.discountValue || 0);
          const percentageB = originalPriceB > 0 ? ((b.discountValue || 0) / originalPriceB) * 100 : 0;
          
          return percentageB - percentageA; // Sắp xếp theo phần trăm giảm dần
        });

        setProducts(promoProducts);
      } catch (error) {
        console.error('Error fetching promotion products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromoProducts();
  }, []);

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === '') return '0 ₫';
    const value = Math.round(Number(price) || 0);
    return (
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' ₫'
    );
  };

  // Calculate discount percentage from promotion
  const calculateDiscountPercentage = (product) => {
    // Only show discount if product has valid promotion
    if (!product.promotionId || !product.promotionName) return null;
    if (!product.discountValue || product.discountValue <= 0) return null;
    if (!product.price || product.price <= 0) return null;

    // Calculate original price: price + discountValue
    const originalPrice = product.price + product.discountValue;
    if (originalPrice <= 0) return null;

    // Calculate percentage: (discountValue / originalPrice) * 100
    const percentage = Math.round((product.discountValue / originalPrice) * 100);

    // Only return if percentage is greater than 0
    return percentage > 0 ? percentage : null;
  };

  const getProductImage = (product) => {
    if (product.defaultMediaUrl) return product.defaultMediaUrl;
    if (product.mediaUrls && product.mediaUrls.length > 0) return product.mediaUrls[0];
    return productImg;
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const check = () => {
      setCanScrollLeft(track.scrollLeft > 0);
      setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 1);
    };

    check();
    track.addEventListener('scroll', check);
    window.addEventListener('resize', check);
    return () => {
      track.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [products.length]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const track = trackRef.current;
    if (!track || products.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardId = entry.target.dataset.cardId;
            setVisibleCards((prev) => new Set([...prev, cardId]));
          }
        });
      },
      {
        root: track,
        threshold: 0.2,
        rootMargin: '50px',
      }
    );

    const cards = track.querySelectorAll(`.${styles['card-wrapper']}`);
    cards.forEach((card) => observer.observe(card));

    return () => {
      cards.forEach((card) => observer.unobserve(card));
    };
  }, [products.length]);

  const scrollBy = (dir = 1) => {
    const track = trackRef.current;
    if (!track) return;
    const cardWrapper = track.querySelector(`.${styles['card-wrapper']}`);
    if (!cardWrapper) return;
    const step = cardWrapper.offsetWidth + 24; // gap is 24px
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  // Show section even if no products (for debugging)
  // if (!loading && products.length === 0) {
  //   return null;
  // }

  return (
    <section className={cx('container')} aria-labelledby="hot-promotions-heading">
      <div className={cx('inner')}>
        <div className={cx('headingRow')}>
          <h2 id="hot-promotions-heading" className={cx('title')}>
            KHUYẾN MÃI HOT
          </h2>
        </div>

        <div className={cx('carousel')}>
          <button
            className={cx('arrow', 'left')}
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            aria-label="Previous products"
          >
            &#10094;
          </button>

          <div className={cx('track')} ref={trackRef}>
            {loading ? (
              <div className={cx('loading')}>Đang tải...</div>
            ) : products.length === 0 ? (
              <div className={cx('empty')}>Chưa có sản phẩm khuyến mãi</div>
            ) : (
              products.map((p, index) => {
                const discountPercent = calculateDiscountPercentage(p);
                const originalPrice = (p.price || 0) + (p.discountValue || 0);
                return (
                  <div
                    key={p.id}
                    className={cx('card-wrapper', { 'card-visible': visibleCards.has(`${p.id}`) })}
                    data-card-id={p.id}
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    <Link to={`/product/${p.id}`} className={cx('card')} onClick={() => scrollToTop()}>
                      <div className={cx('img-wrap')}>
                        <img
                          src={getProductImage(p)}
                          alt={p.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = productImg;
                          }}
                        />
                        <span className={cx('hot-badge')}>HOT DEAL</span>
                      </div>
                      <div className={cx('info')}>
                        <h4 className={cx('name')}>{p.name}</h4>
                        <p className={cx('desc')} title={p.description}>
                          {p.description ? `${p.description.slice(0, 70)}${p.description.length > 70 ? '…' : ''}` : 'Sản phẩm chất lượng cao'}
                        </p>
                        <div className={cx('price-section')}>
                          {discountPercent ? (
                            <>
                              <span className={cx('old-price')}>
                                {formatPrice(originalPrice)}
                              </span>
                              <span className={cx('price')}>{formatPrice(p.price)}</span>
                              <span className={cx('discount')}>
                                -{discountPercent}%
                              </span>
                            </>
                          ) : (
                            <span className={cx('price')}>{formatPrice(p.price)}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          <button
            className={cx('arrow', 'right')}
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            aria-label="Next products"
          >
            &#10095;
          </button>
        </div>

        <div className={cx('controls')}>
          <Link to="/promo" className={cx('viewAll')} onClick={() => scrollToTop()}>
            Xem tất cả
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HotPromotions;

