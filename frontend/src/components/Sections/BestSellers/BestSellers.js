import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './BestSellers.module.scss';
import productImg from '../../../assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';
import { getActiveProducts } from '~/services/product';

const cx = classNames.bind(styles);

const CAROUSEL_THRESHOLD = 4;

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
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching approved products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const isCarousel = products.length > CAROUSEL_THRESHOLD;

  const formatPrice = (price) => {
    const value = Math.round(Number(price) || 0);
    return (
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' ₫'
    );
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
                products.slice(0, 8).map((p) => (
                  <div key={p.id} className={cx('slide')}>
                    <article className={cx('card')}>
                      <Link to={`/product/${p.id}`} className={cx('img-wrap')} onClick={() => scrollToTop()}>
                        <img 
                          src={getProductImage(p)} 
                          alt={p.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = productImg;
                          }}
                        />
                        <span className={cx('freeship')}>FREESHIP</span>
                      </Link>
                      <div className={cx('info')}>
                        <h3 className={cx('name')}>{p.name}</h3>
                        <p className={cx('desc')}>{p.description || 'Sản phẩm chất lượng cao'}</p>
                        <div className={cx('price-section')}>
                          <span className={cx('price')}>{formatPrice(p.unitPrice ?? p.price)}</span>
                        </div>
                      </div>
                    </article>
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
              products.slice(0, 8).map((p) => (
                <article key={p.id} className={cx('card')}>
                  <Link to={`/product/${p.id}`} className={cx('img-wrap')} onClick={() => scrollToTop()}>
                    <img 
                      src={getProductImage(p)} 
                      alt={p.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = productImg;
                      }}
                    />
                    <span className={cx('freeship')}>FREESHIP</span>
                  </Link>
                  <div className={cx('info')}>
                    <h3 className={cx('name')}>{p.name}</h3>
                    <p className={cx('desc')}>{p.description || 'Sản phẩm chất lượng cao'}</p>
                    <div className={cx('price-section')}>
                      <span className={cx('price')}>{formatPrice(p.unitPrice ?? p.price)}</span>
                    </div>
                  </div>
                </article>
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
