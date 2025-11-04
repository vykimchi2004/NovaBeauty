import React, { useState } from 'react';
import styles from './Hero.module.scss';
import banner1 from '../../../assets/images/banners/banner1.jpg';
import banner2 from '../../../assets/images/banners/banner2.jpg';
import banner3 from '../../../assets/images/banners/banner3.jpg';
const Hero = () => {
  console.log('Hero component is rendering!');
  const slides = [banner1, banner2, banner3];
  const [current, setCurrent] = useState(0);

  return (
    <div className={styles['hero-slider']}>
      {slides.map((slide, index) => (
        <div className={index === current ? `${styles.slide} ${styles.active}` : styles.slide} key={index}>
          {index === current && <img src={slide} alt={`banner-${index}`} />}
        </div>
      ))}

      <button
        className={styles.prev}
        onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
        aria-label="Previous slide"
      >
        &#10094;
      </button>
      <button
        className={styles.next}
        onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
        aria-label="Next slide"
      >
        &#10095;
      </button>

      <div className={styles.dots}>
        {slides.map((_, index) => (
          <span
            key={index}
            className={index === current ? `${styles.dot} ${styles.active}` : styles.dot}
            onClick={() => setCurrent(index)}
            role="button"
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Hero;
