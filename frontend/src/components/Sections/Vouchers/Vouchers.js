import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Vouchers.module.scss';
import voucher1 from '~/assets/images/vouchers/voucher1.png';
import voucher2 from '~/assets/images/vouchers/voucher2.png';

const cx = classNames.bind(styles);

function Vouchers() {
  const vouchers = [
    { id: 1, img: voucher1, alt: 'Voucher khuyến mãi 1', to: '/promo' },
    { id: 2, img: voucher2, alt: 'Giá tốt hôm nay', to: '/promo' },
  ];

  return (
    <section className={cx('container')} aria-labelledby="vouchers-heading">
      <div className={cx('inner')}>
        <div className={cx('grid')}>
          {vouchers.map((v) => (
            <Link key={v.id} to={v.to} className={cx('card')} aria-label={v.alt}>
              <img src={v.img} alt={v.alt} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Vouchers;
