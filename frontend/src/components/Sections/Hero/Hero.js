import React from 'react';
import styles from './Hero.module.scss';
import classNames from 'classnames/bind';
import banner1 from '../../../assets/images/banners/banner1.png';
import banner2 from '../../../assets/images/banners/banner2.png';
import banner3 from '../../../assets/images/banners/banner3.png';
const cx = classNames.bind(styles);

const Hero = () => {
  const banners = [banner1, banner2, banner3];

  return (
    <div className={cx('heroWrapper')}>
      {banners.map((banner, index) => (
        <div key={index} className={cx('banner')}>
          <img src={banner} alt={`banner-${index + 1}`} />
        </div>
      ))}
    </div>
  );
};

export default Hero;
