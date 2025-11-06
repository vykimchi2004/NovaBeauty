import React, { useState } from 'react';
import styles from './Hero.module.scss';
import classNames from 'classnames/bind';
import banner1 from '../../../assets/images/banners/banner1.jpg';
import banner2 from '../../../assets/images/banners/banner2.jpg';
import banner3 from '../../../assets/images/banners/banner3.jpg';
const cx = classNames.bind(styles);

const Hero = () => {
  console.log('Hero component is rendering!');
  const slides = [banner1, banner2, banner3];
  const [current, setCurrent] = useState(0);

  return (
    <div className={cx('heroWrapper')}>
      <div className={cx('hero-slider')}>
        {slides.map((slide, index) => (
          <div className={index === current ? cx('slide', 'active') : cx('slide')} key={index}>
            {index === current && <img src={slide} alt={`banner-${index}`} />}
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
        <a href="#" className={cx('sideBanner')} aria-label="right-banner-top">
          <img src={banner2} alt="banner-right-1" />
        </a>
        <a href="#" className={cx('sideBanner')} aria-label="right-banner-bottom">
          <img src={banner3} alt="banner-right-2" />
        </a>
      </div>
    </div>
  );
};

export default Hero;
