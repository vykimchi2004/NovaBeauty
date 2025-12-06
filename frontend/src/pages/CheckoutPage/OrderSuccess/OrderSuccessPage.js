import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../CheckoutPage.module.scss';
import orderService from '~/services/order';

const cx = classNames.bind(styles);

function OrderSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);

  const state = location.state || {};
  const { fullName, address, total, order, paymentMethod, subtotal, shippingFee, voucherDiscount } = state;

  // Kiểm tra nếu có orderId từ MoMo redirect (query params)
  const orderIdFromMoMo = searchParams.get('orderId');
  const resultCode = searchParams.get('resultCode');

  useEffect(() => {
    // Nếu có orderId từ MoMo redirect và chưa có order data từ state
    if (orderIdFromMoMo && !order) {
      fetchOrderFromMoMo(orderIdFromMoMo);
    }
  }, [orderIdFromMoMo, order]);

  const fetchOrderFromMoMo = async (orderCode) => {
    try {
      setLoading(true);
      // Tìm đơn hàng theo code
      const orders = await orderService.getMyOrders();
      const foundOrder = orders.find(o => o.code === orderCode || o.id === orderCode);
      
      if (foundOrder) {
        setOrderData({
          order: foundOrder,
          paymentMethod: 'momo',
          total: foundOrder.totalAmount,
          subtotal: (foundOrder.totalAmount || 0) - (foundOrder.shippingFee || 0),
          shippingFee: foundOrder.shippingFee || 0,
          voucherDiscount: 0, // Có thể cần tính lại từ order
          fullName: foundOrder.receiverName || foundOrder.customerName,
          address: foundOrder.shippingAddress,
        });
      } else {
        console.error('Không tìm thấy đơn hàng với mã:', orderCode);
      }
    } catch (error) {
      console.error('Error fetching order from MoMo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sử dụng orderData nếu có (từ MoMo redirect), nếu không dùng state
  const displayData = orderData || {
    order,
    paymentMethod,
    total,
    subtotal,
    shippingFee,
    voucherDiscount,
    fullName,
    address,
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(Number(price) || 0)) + ' ₫';

  const handleContinueShopping = () => {
    // Navigate về trang sản phẩm
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

  // Dispatch event để cập nhật cart count trong header sau khi đặt hàng thành công
  // Cart page sẽ tự động reload khi user quay lại (giống LuminaBook)
  useEffect(() => {
    // Chỉ dispatch event để update cart count trong header, không reload toàn bộ cart
    // Cart page sẽ tự động reload khi user navigate đến
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { source: 'order-success', count: 0 } }));
  }, []);

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
        {loading ? (
          <p className={cx('successMessage')}>Đang tải thông tin đơn hàng...</p>
        ) : (
          <div className={cx('orderInfoList')}>
            {displayData.order?.code && (
              <div className={cx('orderInfoRow')}>
                <span className={cx('orderInfoLabel')}>Mã đơn hàng:</span>
                <span className={cx('orderInfoValue', 'orderCode')}>#{displayData.order.code}</span>
              </div>
            )}
            {displayData.fullName && (
              <div className={cx('orderInfoRow')}>
                <span className={cx('orderInfoLabel')}>Người nhận:</span>
                <span className={cx('orderInfoValue')}>{displayData.fullName}</span>
              </div>
            )}
            <div className={cx('orderInfoRow')}>
              <span className={cx('orderInfoLabel')}>Phương thức thanh toán:</span>
              <span className={cx('orderInfoValue')}>
                {displayData.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Thanh toán qua ví MoMo'}
              </span>
            </div>
            {displayData.subtotal !== undefined && (
              <div className={cx('orderInfoRow')}>
                <span className={cx('orderInfoLabel')}>Tạm tính:</span>
                <span className={cx('orderInfoValue')}>{formatPrice(displayData.subtotal)}</span>
              </div>
            )}
            {displayData.shippingFee !== undefined && (
              <div className={cx('orderInfoRow')}>
                <span className={cx('orderInfoLabel')}>Phí vận chuyển:</span>
                <span className={cx('orderInfoValue')}>{formatPrice(displayData.shippingFee)}</span>
              </div>
            )}
            {displayData.voucherDiscount > 0 && (
              <div className={cx('orderInfoRow')}>
                <span className={cx('orderInfoLabel')}>Giảm giá:</span>
                <span className={cx('orderInfoValue', 'discount')}>-{formatPrice(displayData.voucherDiscount)}</span>
              </div>
            )}
            <div className={cx('orderInfoRow', 'totalRow')}>
              <span className={cx('orderInfoLabel')}>Tổng cộng:</span>
              <span className={cx('orderInfoValue', 'totalValue')}>{formatPrice(displayData.total || 0)}</span>
            </div>
          </div>
        )}

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


