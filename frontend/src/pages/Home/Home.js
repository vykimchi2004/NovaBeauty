import React from 'react';
import Hero from '../../components/Sections/Hero/Hero';
import styles from './Home.module.scss';
import classNames from 'classnames/bind';
import BestSellers from '../../components/Sections/BestSellers/BestSellers';
import Vouchers from '../../components/Sections/Vouchers/Vouchers';
import FeaturedCategories from '../../components/Sections/FeaturedCategories/FeaturedCategories';

const Home = () => {
  console.log('Home component is rendering!');

  const cx = classNames.bind(styles);

  return (
    <div className={cx('home')}>
      <Hero />
      <BestSellers />
      <FeaturedCategories />
      <Vouchers />
      {/* other home sections can be added here */}
    </div>
  );
};

export default Home;
