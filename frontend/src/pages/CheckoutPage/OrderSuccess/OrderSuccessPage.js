import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../CheckoutPage.module.scss';

const cx = classNames.bind(styles);

function OrderSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state || {};
  const { fullName, address, total, order, paymentMethod, subtotal, shippingFee, voucherDiscount } = state;

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(Number(price) || 0)) + ' ₫';

  const handleContinueShopping = () => {
    navigate('/products');
  };

  const handleViewOrders = () => {
    navigate('/profile', { 
      state: { 
        section: 'orders',
        orderTab: 'pending' // Mở tab "Chờ xác nhận"
      } 
    });
  };

  return (
    <div className={cx('orderSuccessContainer')}>
      <div className={cx('orderSuccessSection')}>
        {/* Icon checkmark */}
        <div className={cx('successIcon')}>
          <FontAwesomeIcon icon={faCheckCircle} />
        </div>

        {/* Tiêu đề */}
        <h1 className={cx('successTitle')}>
          Cảm ơn bạn đã đặt hàng tại NovaBeauty!
        </h1>

        {/* Thông báo xác nhận */}
        <p className={cx('successMessage')}>
        Bạn đã đặt hàng thành công. Vui lòng chờ nhân viên xác nhận đơn hàng của bạn.
        </p>

        {/* Thông tin đơn hàng */}
        <div className={cx('orderInfoList')}>
          {order?.code && (
            <div className={cx('orderInfoRow')}>
              <span className={cx('orderInfoLabel')}>Mã đơn hàng:</span>
              <span className={cx('orderInfoValue', 'orderCode')}>#{order.code}</span>
            </div>
          )}
          {fullName && (
            <div className={cx('orderInfoRow')}>
              <span className={cx('orderInfoLabel')}>Người nhận:</span>
              <span className={cx('orderInfoValue')}>{fullName}</span>
            </div>
          )}
          <div className={cx('orderInfoRow')}>
            <span className={cx('orderInfoLabel')}>Phương thức thanh toán:</span>
            <span className={cx('orderInfoValue')}>
              {paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán qua ví MoMo'}
            </span>
          </div>
          {subtotal !== undefined && (
            <div className={cx('orderInfoRow')}>
              <span className={cx('orderInfoLabel')}>Tạm tính:</span>
              <span className={cx('orderInfoValue')}>{formatPrice(subtotal)}</span>
            </div>
          )}
          {shippingFee !== undefined && (
            <div className={cx('orderInfoRow')}>
              <span className={cx('orderInfoLabel')}>Phí vận chuyển:</span>
              <span className={cx('orderInfoValue')}>{formatPrice(shippingFee)}</span>
            </div>
          )}
          {voucherDiscount > 0 && (
            <div className={cx('orderInfoRow')}>
              <span className={cx('orderInfoLabel')}>Giảm giá:</span>
              <span className={cx('orderInfoValue', 'discount')}>-{formatPrice(voucherDiscount)}</span>
            </div>
          )}
          <div className={cx('orderInfoRow', 'totalRow')}>
            <span className={cx('orderInfoLabel')}>Tổng cộng:</span>
            <span className={cx('orderInfoValue', 'totalValue')}>{formatPrice(total || 0)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className={cx('successActions')}>
          <button type="button" className={cx('btn', 'btnContinueShopping')} onClick={handleContinueShopping}>
            Tiếp tục mua sắm
          </button>
          <button type="button" className={cx('btn', 'btnViewOrder')} onClick={handleViewOrders}>
            Xem đơn hàng
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderSuccessPage;


