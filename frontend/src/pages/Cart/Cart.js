import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './Cart.module.scss';
import cartService from '~/services/cart';
import notify from '~/utils/notification';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';

const cx = classNames.bind(styles);

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
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
      setIsUnauthenticated(false);
      
      // Kiểm tra token trước khi gọi API
      const token = storage.get(STORAGE_KEYS.TOKEN);
      if (!token) {
        setIsUnauthenticated(true);
        setCartItems([]);
        setSubtotal(0);
        setTotal(0);
        return;
      }
      
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
        finalPrice: item.finalPrice,
        colorCode: item.colorCode || null,
      }));

      setCartItems(items);
      setSubtotal(cartData.subtotal || 0);
      setAppliedDiscount(cartData.voucherDiscount || 0);
      setAppliedVoucherCode(cartData.appliedVoucherCode);
      setTotal(cartData.totalAmount || 0);
      setIsUnauthenticated(false);

      // Chỉ dispatch event nếu không phải từ event listener (tránh loop)
      if (!skipEventDispatch) {
        // Dispatch event để cập nhật cart count trong header
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      // Nếu lỗi do chưa đăng nhập
      if (error.code === 401 || error.code === 403 || error.status === 401 || error.status === 403) {
        setIsUnauthenticated(true);
        setCartItems([]);
        setSubtotal(0);
        setTotal(0);
      } else {
        notify.error('Không thể tải giỏ hàng. Vui lòng thử lại.');
        setCartItems([]);
        setSubtotal(0);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    const value = Math.round(Number(price) || 0);
    return (
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' ₫'
    );
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

    const newQuantity = item.quantity + delta;
    
    try {
      if (newQuantity < 0) {
        // Nếu quantity về âm, không làm gì
        notify.warning('Số lượng không thể nhỏ hơn 0');
        return;
      }
      
      // Sử dụng addItem với delta để tăng/giảm số lượng
      // Backend sẽ tự động cộng thêm delta vào quantity hiện tại
      // Nếu quantity về 0 hoặc âm, backend sẽ tự động xóa item
      await cartService.addItem(item.productId, delta, item.colorCode || null);
      await loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      notify.error(error.message || 'Không thể cập nhật số lượng. Vui lòng thử lại.');
    }
  };

  const handleRemoveItem = async (id) => {
    try {
      const item = cartItems.find(i => i.id === id);
      if (!item) {
        console.warn('[Cart] Item not found:', id);
        return;
      }
      
      console.log('[Cart] Removing item:', { id, productId: item.productId, quantity: item.quantity });
      
      // Xóa bằng cách thêm với quantity âm bằng với số lượng hiện tại
      // Backend sẽ tự động xóa item khi quantity về 0 hoặc âm
      await cartService.addItem(item.productId, -item.quantity, item.colorCode || null);
      
      // Reload cart để cập nhật UI
      await loadCart();
      
      // Dispatch event để cập nhật cart count trong header
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (error) {
      console.error('[Cart] Error removing item:', error);
      notify.error(error.message || 'Không thể xóa sản phẩm. Vui lòng thử lại.');
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
            {isUnauthenticated ? (
              <>
                <p>Vui lòng đăng nhập để xem giỏ hàng của bạn</p>
                <Link to="/products" className={cx('continueShopping')}>
                  Tiếp tục mua sắm
                </Link>
              </>
            ) : (
              <>
                <p>Giỏ hàng của bạn đang trống</p>
                <a href="/products" className={cx('continueShopping')}>
                  Tiếp tục mua sắm
                </a>
              </>
            )}
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
                        {item.colorCode && (
                          <div className={cx('productColorCode')}>
                            Mã màu: <span>{item.colorCode}</span>
                          </div>
                        )}
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
