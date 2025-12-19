import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './BestSellers.module.scss';
import productImg from '../../../assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';
import { getActiveProducts } from '~/services/product';

const cx = classNames.bind(styles);

function BestSellers() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set());
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getActiveProducts();

        const productsList = Array.isArray(data)
          ? data
          : (data?.result && Array.isArray(data.result) ? data.result : []);

        // Lọc các sản phẩm hợp lệ
        const validProducts = productsList.filter(
          p => p && p.id && (p.price !== null && p.price !== undefined)
        );

        // 💥 Lọc sản phẩm bán chạy: quantitySold > 0
        const soldProducts = validProducts.filter(
          p => (p.quantitySold || 0) > 0
        );

        // 💥 Sắp xếp giảm dần theo số lượng bán
        const sortedProducts = soldProducts.sort((a, b) => {
          const aSold = a.quantitySold || 0;
          const bSold = b.quantitySold || 0;
          return bSold - aSold; // giảm dần
        });

        // 💥 Lấy top 8
        setProducts(sortedProducts.slice(0, 8));

      } catch (error) {
        console.error("Error fetching best sellers:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
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

    const cards = track.querySelectorAll(`.${styles.slide}`);
    cards.forEach((card) => observer.observe(card));

    return () => {
      cards.forEach((card) => observer.unobserve(card));
    };
  }, [products.length]);

  const scrollBy = (dir = 1) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.querySelector(`.${styles.slide}`);
    if (!slide) return;
    const step = slide.offsetWidth + 16;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className={cx('container')} aria-labelledby="bestsellers-heading">
      <div className={cx('inner')}>
        <div className={cx('headingRow')}>
          <h2 id="bestsellers-heading" className={cx('title')}>
            TOP SẢN PHẨM BÁN CHẠY
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
              <div className={cx('empty')}>Chưa có sản phẩm nào</div>
            ) : (
              products.slice(0, 8).map((p, index) => (
                <div
                  key={p.id}
                  className={cx('slide', { 'slide-visible': visibleCards.has(`${p.id}`) })}
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
                    </div>
                    <div className={cx('info')}>
                      <h4 className={cx('name')}>{p.name}</h4>
                      <p className={cx('desc')}>{p.description || 'Sản phẩm chất lượng cao'}</p>
                      <div className={cx('price-section')}>
                        {(() => {
                          if (!p || !p.id) {
                            return <span className={cx('price')}>{formatPrice(p?.price)}</span>;
                          }
                          const discountPercent = calculateDiscountPercentage(p);
                          if (!discountPercent) {
                            return <span className={cx('price')}>{formatPrice(p?.price)}</span>;
                          }
                          const originalPrice = (p.price || 0) + (p.discountValue || 0);
                          return (
                            <>
                              <span className={cx('old-price')}>
                                {formatPrice(originalPrice)}
                              </span>
                              <span className={cx('price')}>{formatPrice(p?.price)}</span>
                              <span className={cx('discount')}>
                                -{discountPercent}%
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </Link>
                </div>
              ))
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
          <Link to="/best-sellers" className={cx('viewAll')} onClick={() => scrollToTop()}>
            Xem tất cả
          </Link>
        </div>
      </div>
    </section>
  );
}

export default BestSellers;
