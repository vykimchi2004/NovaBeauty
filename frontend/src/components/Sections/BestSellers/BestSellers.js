import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './BestSellers.module.scss';
import productImg from '../../../assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';
import { getActiveProducts } from '~/services/product';

const cx = classNames.bind(styles);

// Luôn dùng grid layout, không dùng carousel
const USE_CAROUSEL = false;

function BestSellers() {
  console.log('BestSellers component is rendering!');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getActiveProducts();
        // Đảm bảo data là array
        const productsList = Array.isArray(data) ? data : (data?.result && Array.isArray(data.result) ? data.result : []);
        // Lọc các sản phẩm hợp lệ (có id và price)
        const validProducts = productsList.filter(p => p && p.id && (p.price !== null && p.price !== undefined));
        
        // Debug: Log products with promotions
        const productsWithPromo = validProducts.filter(p => p.promotionId || p.discountValue > 0);
        console.log('[BestSellers] Products with promotion:', productsWithPromo.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          discountValue: p.discountValue,
          promotionId: p.promotionId,
          promotionName: p.promotionName
        })));
        
        setProducts(validProducts);
      } catch (error) {
        console.error('Error fetching approved products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const isCarousel = USE_CAROUSEL && products.length > 20;

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
    if (!track || !isCarousel) {
      // if no track (carousel not mounted), reset scroll state
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
  }, [isCarousel, products.length]);

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

        {isCarousel ? (
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
                products.slice(0, 4).map((p) => (
                  <div key={p.id} className={cx('slide')}>
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
                        <span className={cx('freeship')}>FREESHIP</span>
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
        ) : (
          <div className={cx('grid')}>
            {loading ? (
              <div className={cx('loading')}>Đang tải...</div>
            ) : products.length === 0 ? (
              <div className={cx('empty')}>Chưa có sản phẩm nào</div>
            ) : (
              products.slice(0, 4).map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className={cx('card')} onClick={() => scrollToTop()}>
                  <div className={cx('img-wrap')}>
                    <img 
                      src={getProductImage(p)} 
                      alt={p.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = productImg;
                      }}
                    />
                    <span className={cx('freeship')}>FREESHIP</span>
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
              ))
            )}
          </div>
        )}

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
