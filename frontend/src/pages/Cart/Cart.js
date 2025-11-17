import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './Cart.module.scss';
import cartService from '~/services/cart';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCart();
    
    // Lắng nghe event cartUpdated để tự động reload giỏ hàng
    const handleCartUpdated = () => {
      console.log('[Cart] Cart updated event received, reloading cart...');
      // Skip event dispatch để tránh loop vô hạn
      loadCart(true);
    };
    
    window.addEventListener('cartUpdated', handleCartUpdated);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdated);
    };
  }, []);

  const loadCart = async (skipEventDispatch = false) => {
    try {
      setLoading(true);
      const cartData = await cartService.getCart();
      
      // Map dữ liệu từ API sang format hiển thị
      const items = (cartData.items || []).map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        currentPrice: item.unitPrice,
        originalPrice: item.unitPrice, // Có thể lấy từ product nếu cần
        quantity: item.quantity,
        selected: true, // Mặc định chọn tất cả
        finalPrice: item.finalPrice
      }));

      setCartItems(items);
      setSubtotal(cartData.subtotal || 0);
      setAppliedDiscount(cartData.voucherDiscount || 0);
      setAppliedVoucherCode(cartData.appliedVoucherCode);
      setTotal(cartData.totalAmount || 0);

      // Chỉ dispatch event nếu không phải từ event listener (tránh loop)
      if (!skipEventDispatch) {
        // Dispatch event để cập nhật cart count trong header
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      // Nếu lỗi do chưa đăng nhập, giữ giỏ hàng rỗng
      if (error.code !== 401 && error.code !== 403) {
        notify.error('Không thể tải giỏ hàng. Vui lòng thử lại.');
      }
      setCartItems([]);
      setSubtotal(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price || 0) + ' ₫';
  };

  const handleSelectAll = (checked) => {
    setCartItems((items) => items.map((item) => ({ ...item, selected: checked })));
  };

  const handleSelectItem = (id, checked) => {
    setCartItems((items) => items.map((item) => (item.id === id ? { ...item, selected: checked } : item)));
  };

  const handleQuantityChange = async (id, delta) => {
    const item = cartItems.find(i => i.id === id);
    if (!item) return;

    const newQuantity = Math.max(1, item.quantity + delta);
    
    try {
      // Backend chưa có update endpoint, tạm thời xóa và thêm lại
      // Hoặc có thể gọi addItem với quantity âm/dương
      // Tạm thời update local state và reload cart
      await cartService.addItem(item.productId, delta);
      await loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      notify.error('Không thể cập nhật số lượng. Vui lòng thử lại.');
    }
  };

  const handleRemoveItem = async (id) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?',
      'Xác nhận xóa sản phẩm',
      'Xóa',
      'Hủy'
    );
    
    if (!confirmed) return;

    try {
      // Backend chưa có remove endpoint, tạm thời dùng cách khác
      // Có thể implement logic xóa trong backend
      notify.info('Chức năng xóa đang được phát triển. Vui lòng liên hệ admin.');
      // await cartService.removeItem(id);
      // await loadCart();
    } catch (error) {
      console.error('Error removing item:', error);
      notify.error('Không thể xóa sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      notify.warning('Vui lòng nhập mã giảm giá');
      return;
    }

    try {
      const cartData = await cartService.applyVoucher(discountCode.trim());
      setAppliedDiscount(cartData.voucherDiscount || 0);
      setAppliedVoucherCode(cartData.appliedVoucherCode);
      setTotal(cartData.totalAmount || 0);
      notify.success('Áp dụng mã giảm giá thành công!');
      await loadCart();
    } catch (error) {
      console.error('Error applying voucher:', error);
      notify.error(error.message || 'Không thể áp dụng mã giảm giá. Vui lòng thử lại.');
    }
  };

  const selectedItems = cartItems.filter((item) => item.selected);
  const allSelected = cartItems.length > 0 && cartItems.every((item) => item.selected);
  const selectedCount = selectedItems.length;

  // Tính lại subtotal và total từ selected items
  const calculatedSubtotal = selectedItems.reduce((sum, item) => sum + (item.finalPrice || item.currentPrice * item.quantity), 0);
  const calculatedTotal = calculatedSubtotal - appliedDiscount;

  if (loading) {
    return (
      <div className={cx('container')}>
        <div className={cx('loading')}>Đang tải giỏ hàng...</div>
      </div>
    );
  }

  return (
    <div className={cx('container')}>
      <div className={cx('cartSection')}>
        <div className={cx('cartHeader')}>
          <h2 className={cx('cartTitle')}>GIỎ HÀNG ({cartItems.length} sản phẩm)</h2>
          {cartItems.length > 0 && (
            <label className={cx('selectAllLabel')}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className={cx('checkbox')}
              />
              <span>Chọn tất cả ({cartItems.length} sản phẩm)</span>
            </label>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className={cx('emptyCart')}>
            <p>Giỏ hàng của bạn đang trống</p>
            <a href="/products" className={cx('continueShopping')}>
              Tiếp tục mua sắm
            </a>
          </div>
        ) : (
          <div className={cx('cartTableWrapper')}>
            <table className={cx('cartTable')}>
              <thead>
                <tr>
                  <th></th>
                  <th>Sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Thành tiền</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                        className={cx('checkbox')}
                      />
                    </td>
                    <td>
                      <div className={cx('productInfo')}>
                        <div className={cx('productName')}>{item.name}</div>
                        <div className={cx('productPrice')}>
                          <span className={cx('currentPrice')}>{formatPrice(item.currentPrice)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={cx('quantityControl')}>
                        <button
                          type="button"
                          className={cx('quantityBtn')}
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={item.quantity <= 1}
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          readOnly
                          className={cx('quantityInput')}
                          min="1"
                        />
                        <button
                          type="button"
                          className={cx('quantityBtn')}
                          onClick={() => handleQuantityChange(item.id, 1)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={cx('itemTotal')}>
                        {formatPrice(item.finalPrice || item.currentPrice * item.quantity)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={cx('removeBtn')}
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={cx('summarySection')}>
        <div className={cx('discountCard')}>
          <h3 className={cx('discountTitle')}>MÃ GIẢM GIÁ</h3>
          <div className={cx('discountInputGroup')}>
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className={cx('discountInput')}
              placeholder="Nhập mã giảm giá"
            />
            <button type="button" className={cx('btn', 'btnApply')} onClick={handleApplyDiscount}>
              Áp dụng
            </button>
          </div>
          {appliedVoucherCode && (
            <div className={cx('appliedVoucher')}>
              Đã áp dụng: <strong>{appliedVoucherCode}</strong>
            </div>
          )}
        </div>

        <div className={cx('orderSummary')}>
          <div className={cx('summaryRow')}>
            <span>Tạm tính:</span>
            <span>{formatPrice(calculatedSubtotal || subtotal)}</span>
          </div>
          {appliedDiscount > 0 && (
            <div className={cx('summaryRow')}>
              <span>Giảm giá:</span>
              <span className={cx('discountAmount')}>-{formatPrice(appliedDiscount)}</span>
            </div>
          )}
          <div className={cx('summaryRow', 'totalRow')}>
            <span>Tổng cộng (đã gồm VAT):</span>
            <span className={cx('totalAmount')}>{formatPrice(calculatedTotal || total)}</span>
          </div>
          <button type="button" className={cx('btn', 'btnBuy')}>
            MUA HÀNG
          </button>
          <p className={cx('vatNote')}>(Giá hiển thị đã bao gồm VAT)</p>
        </div>
      </div>
    </div>
  );
}

export default Cart;
