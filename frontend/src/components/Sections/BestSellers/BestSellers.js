import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './BestSellers.module.scss';
import productImg from '../../../assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';

const cx = classNames.bind(styles);

const mockProducts = [
  { id: 1, name: 'Radiant Glow Serum', price: '₫499,000', img: productImg },
  { id: 2, name: 'Velvet Matte Lipstick', price: '₫199,000', img: productImg },
  { id: 3, name: 'Hydra Boost Cream', price: '₫299,000', img: productImg },
  { id: 4, name: 'Luminous Highlighter', price: '₫259,000', img: productImg },
  { id: 5, name: 'Soothing Face Mist', price: '₫199,000', img: productImg },
  { id: 6, name: 'Soothing Face Mist', price: '₫199,000', img: productImg },
  { id: 7, name: 'Soothing Face Mist', price: '₫199,000', img: productImg },
];

const CAROUSEL_THRESHOLD = 4;

function BestSellers() {
  console.log('BestSellers component is rendering!');
  const isCarousel = mockProducts.length > CAROUSEL_THRESHOLD;
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
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
  }, [isCarousel]);

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
              {mockProducts.map((p) => (
                <div key={p.id} className={cx('slide')}>
                  <article className={cx('card')}>
                    <Link to={`/product/${p.id}`} className={cx('img-wrap')} onClick={() => scrollToTop()}>
                      <img src={p.img} alt={p.name} />
                      <span className={cx('freeship')}>FREESHIP</span>
                    </Link>
                    <div className={cx('info')}>
                      <h3 className={cx('name')}>{p.name}</h3>
                      <p className={cx('desc')}>Mô tả sản phẩm đang bán chạy</p>
                      <div className={cx('price-section')}>
                        <span className={cx('price')}>{p.price}</span>
                        <span className={cx('old-price')}>₫599,000</span>
                        <span className={cx('discount')}>-10%</span>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
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
            {mockProducts.map((p) => (
              <article key={p.id} className={cx('card')}>
                <Link to={`/product/${p.id}`} className={cx('img-wrap')} onClick={() => scrollToTop()}>
                  <img src={p.img} alt={p.name} />
                  <span className={cx('freeship')}>FREESHIP</span>
                </Link>
                <div className={cx('info')}>
                  <h3 className={cx('name')}>{p.name}</h3>
                  <p className={cx('desc')}>Mô tả sản phẩm đang bán chạy</p>
                  <div className={cx('price-section')}>
                    <span className={cx('price')}>{p.price}</span>
                    <span className={cx('old-price')}>₫599,000</span>
                    <span className={cx('discount')}>-10%</span>
                  </div>
                </div>
              </article>
            ))}
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
