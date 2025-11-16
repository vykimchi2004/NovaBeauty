import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Vouchers.module.scss';
import voucher1 from '../../../assets/images/vouchers/voucher1.png';
import voucher2 from '../../../assets/images/vouchers/voucher2.png';
import voucher3 from '../../../assets/images/vouchers/voucher3.png';

const cx = classNames.bind(styles);

function Banner() {
  const slides = [voucher1, voucher2, voucher3];
  const [current, setCurrent] = useState(0);

  return (
    <section className={cx('container')} aria-labelledby="banners-heading">
      <div className={cx('inner')}>
        <div className={cx('voucherWrapper')}>
          <div className={cx('voucher-slider')}>
            {slides.map((slide, index) => (
              <div className={index === current ? cx('slide', 'active') : cx('slide')} key={index}>
                {index === current && (
                  <Link to="/promo" className={cx('slide-link')}>
                    <img src={slide} alt={`banner-${index}`} />
                  </Link>
                )}
              </div>
            ))}

            <button
              className={cx('prev')}
              onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
              aria-label="Previous slide"
            >
              &#10094;
            </button>
            <button
              className={cx('next')}
              onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
              aria-label="Next slide"
            >
              &#10095;
            </button>

            <div className={cx('dots')}>
              {slides.map((_, index) => (
                <span
                  key={index}
                  className={index === current ? cx('dot', 'active') : cx('dot')}
                  onClick={() => setCurrent(index)}
                  role="button"
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className={cx('rightBanners')}>
            <Link to="/promo" className={cx('sideBanner')} aria-label="right-banner-top">
              <img src={voucher2} alt="banner-right-1" />
            </Link>
            <Link to="/promo" className={cx('sideBanner')} aria-label="right-banner-bottom">
              <img src={voucher3} alt="banner-right-2" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Banner;
