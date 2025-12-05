import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../CheckoutPage.module.scss';
import notify from '~/utils/notification';
import orderService from '~/services/order';

const cx = classNames.bind(styles);

function ConfirmCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const state = location.state || {};
  const items = state.items || [];
  const {
    fullName,
    phone,
    address,
    paymentMethod,
    subtotal,
    shippingFee,
    voucherDiscount,
    total,
    orderNote,
    selectedItemIds,
    shippingAddressJson,
    selectedAddressId,
  } = state;

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(Number(price) || 0)) + ' ₫';

  const handleBack = () => {
    navigate('/checkout', { state });
  };

  const handleConfirm = async () => {
    if (loading) return;

    // Nếu là COD, gọi API tạo đơn hàng và chuyển sang trang thank you
    if (paymentMethod === 'cod') {
      setLoading(true);
      try {
        const request = {
          shippingAddress: shippingAddressJson || JSON.stringify({
            name: fullName,
            phone: phone,
            address: address,
          }),
          addressId: selectedAddressId || null,
          note: orderNote || null,
          shippingFee: shippingFee || 0,
          cartItemIds: selectedItemIds && selectedItemIds.length > 0 ? selectedItemIds : null,
          paymentMethod: 'cod',
        };

        const result = await orderService.createOrder(request);
        
        // Dispatch event để cập nhật giỏ hàng (backend đã xóa các items đã đặt hàng)
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { source: 'order-placement' } }));
        
        // Chuyển sang trang thank you với thông tin đơn hàng
        navigate('/order-success', {
          state: {
            order: result.order,
            items: items,
            fullName: fullName,
            address: address,
            total: total,
            paymentMethod: paymentMethod,
          },
        });
      } catch (error) {
        console.error('Error creating order:', error);
        notify.error(error.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    } else {
      // Nếu là MoMo, xử lý thanh toán (sẽ được cập nhật sau)
      notify.success('Đặt hàng thành công (demo).');
      navigate('/order-success', { state });
    }
  };

  if (!items.length) {
    // Không có dữ liệu tóm tắt -> quay lại bước checkout
    navigate('/checkout');
    return null;
  }

  return (
    <div className={cx('container')}>
      <div className={cx('cartSection')}>
        <div className={cx('cartHeader')}>
          <h2 className={cx('cartTitle')}>Xác nhận đơn hàng</h2>
        </div>

        <div className={cx('checkoutAddressWrapper')}>
          <h3 className={cx('checkoutAddressTitle')}>Địa chỉ giao hàng</h3>
          <div className={cx('checkoutAddress')}>
            <div className={cx('checkoutAddressContent')}>
              <div className={cx('checkoutAddressName')}>{fullName}</div>
              <div className={cx('checkoutAddressLine')}>{address}</div>
              <div className={cx('checkoutAddressLine')}>Số điện thoại: {phone}</div>
            </div>
          </div>
        </div>

        <div className={cx('checkoutSubSection')}>
          <h3 className={cx('checkoutSubTitle')}>Phương thức thanh toán</h3>
          <div className={cx('checkoutItems')}>
            <p>
              {paymentMethod === 'momo'
                ? 'Thanh toán qua ví MoMo'
                : 'Thanh toán khi nhận hàng (COD)'}
            </p>
          </div>
        </div>

        <div className={cx('checkoutSubSection')}>
          <h3 className={cx('checkoutSubTitle')}>Sản phẩm</h3>
          <div className={cx('checkoutItems')}>
            <ul className={cx('checkoutItemsList')}>
              {items.map((item) => (
                <li key={item.id} className={cx('checkoutItem')}>
                  <span className={cx('checkoutItemName')}>{item.name}</span>
                  <span className={cx('checkoutItemQty')}>x{item.quantity}</span>
                  <span className={cx('checkoutItemPrice')}>{formatPrice(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={cx('summarySection')}>
        <div className={cx('orderSummary')}>
          <div className={cx('summaryRow')}>
            <span>Tạm tính:</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {voucherDiscount > 0 && (
            <div className={cx('summaryRow')}>
              <span>Giảm giá voucher:</span>
              <span className={cx('discountAmount')}>-{formatPrice(voucherDiscount)}</span>
            </div>
          )}
          <div className={cx('summaryRow', 'totalRow')}>
            <span>Tổng cộng (đã gồm VAT):</span>
            <span className={cx('totalAmount')}>{formatPrice(total)}</span>
          </div>

          <button type="button" className={cx('btn', 'btnApply')} onClick={handleBack} disabled={loading}>
            Quay lại chỉnh sửa
          </button>
          <button
            type="button"
            className={cx('btn', 'btnBuy')}
            onClick={handleConfirm}
            disabled={loading}
            style={{ marginTop: 12 }}
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmCheckoutPage;


