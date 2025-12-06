import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faMinus, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './Cart.module.scss';
import cartService from '~/services/cart';
import { getActiveVouchers } from '~/services/voucher';
import notify from '~/utils/notification';
import { useCart } from '~/hooks';

const cx = classNames.bind(styles);

function Cart() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cartItems,
    setCartItems,
    loading,
    isUnauthenticated,
    subtotal,
    total,
    appliedDiscount,
    appliedVoucherCode,
    loadCart,
    applyVoucher,
    clearVoucher,
  } = useCart({ autoLoad: true, listenToEvents: true }); // Giữ autoLoad để tự động load khi mount

  const [discountCode, setDiscountCode] = useState('');
  const [suggestedVouchers, setSuggestedVouchers] = useState([]);
  const [quantityErrors, setQuantityErrors] = useState({});
  const [quantityInputValues, setQuantityInputValues] = useState({}); // Lưu giá trị input tạm thời

  // Force reload cart mỗi khi vào trang Cart (giống LuminaBook)
  // Reload khi location.pathname thay đổi (khi navigate đến trang này)
  useEffect(() => {
    // Chỉ reload khi đang ở trang /cart
    if (location.pathname === '/cart') {
      console.log('[Cart] Reloading cart on navigate to cart page...');
      // Sử dụng setTimeout nhỏ để đảm bảo component đã mount xong
      const timer = setTimeout(() => {
        loadCart();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Chỉ depend vào location.pathname để reload khi navigate đến trang này

  // Tự động xóa voucher khi user rời khỏi trang giỏ hàng (component unmount)
  useEffect(() => {
    return () => {
      // Chỉ xóa voucher nếu có voucher đang được áp dụng
      if (appliedVoucherCode) {
        console.log('[Cart] Clearing voucher on unmount:', appliedVoucherCode);
        clearVoucher().catch(error => {
          // Không hiển thị lỗi nếu user đã đăng xuất hoặc có lỗi network
          if (error.code !== 401 && error.code !== 403 && error.status !== 401 && error.status !== 403) {
            console.error('[Cart] Error clearing voucher on unmount:', error);
          }
        });
      }
    };
  }, [appliedVoucherCode, clearVoucher]);

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

  const handleCheckout = () => {
    const selectedItems = cartItems.filter((item) => item.selected);
    if (!selectedItems.length) {
      notify.warning('Vui lòng chọn ít nhất một sản phẩm để tiếp tục thanh toán.');
      return;
    }

    const selectedItemIds = selectedItems.map((item) => item.id);
    navigate('/checkout', { state: { selectedItemIds } });
  };

  const handleQuantityChange = async (id, delta) => {
    const item = cartItems.find((i) => i.id === id);
    if (!item) return;

    let newQuantity = item.quantity + delta;

    // Không cho nhỏ hơn 1
    if (newQuantity < 1) {
      newQuantity = 1;
      delta = 1 - item.quantity;
    }

    // Nếu có maxQuantity (tồn kho) thì không cho vượt quá
    if (item.maxQuantity != null && newQuantity > item.maxQuantity) {
      // Hiển thị lỗi và không cho phép tăng thêm
      setQuantityErrors((prev) => ({
        ...prev,
        [id]: `Số lượng tối đa còn lại là ${item.maxQuantity}.`,
      }));
      return; // Dừng lại, không gọi API
    }

    try {
      // Optimistic update: cập nhật UI ngay lập tức
      const updatedItems = cartItems.map((i) => {
        if (i.id === id) {
          const updatedQuantity = i.id === id ? newQuantity : i.quantity;
          return {
            ...i,
            quantity: updatedQuantity,
            finalPrice: i.currentPrice * updatedQuantity,
          };
        }
        return i;
      });

      setCartItems(updatedItems);
      // Xóa lỗi cho item này vì đã cập nhật hợp lệ
      setQuantityErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      
      // Gọi API để cập nhật backend
      await cartService.addItem(item.productId, delta, item.colorCode || null);
      
      // Reload lại cart để đồng bộ với backend (sẽ tự động cập nhật subtotal và total)
      await loadCart(true, true);
      
      // Dispatch event để cập nhật cart count trong header
        window.dispatchEvent(
          new CustomEvent('cartUpdated', { detail: { source: 'cart-page' } }),
        );
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Nếu có lỗi, reload lại cart để khôi phục state
      await loadCart(true, true);
      notify.error(error.message || 'Không thể cập nhật số lượng. Vui lòng thử lại.');
    }
  };

  // Cho phép nhập số lượng bằng tay, không vượt quá tồn kho (nếu biết)
  const handleQuantityInputChange = async (id, value) => {
    const item = cartItems.find((i) => i.id === id);
    if (!item) return;

    // Lưu giá trị input để hiển thị ngay (cho phép nhập tạm thời)
    setQuantityInputValues((prev) => ({ ...prev, [id]: value }));

    let newQuantity = parseInt(value, 10);
    
    // Nếu không phải số hợp lệ, giữ nguyên giá trị input để người dùng tiếp tục nhập
    if (Number.isNaN(newQuantity)) {
      return;
    }

    // Nếu <= 0, reset về 1
    if (newQuantity <= 0) {
      setQuantityInputValues((prev) => ({ ...prev, [id]: '1' }));
      newQuantity = 1;
    }

    // Kiểm tra tồn kho trước khi cho phép nhập
    if (item.maxQuantity != null && newQuantity > item.maxQuantity) {
      // Hiển thị lỗi
      setQuantityErrors((prev) => ({
        ...prev,
        [id]: `Số lượng tối đa còn lại là ${item.maxQuantity}.`,
      }));
      
      // Reset input về maxQuantity để người dùng biết số lượng tối đa
      setQuantityInputValues((prev) => ({ ...prev, [id]: String(item.maxQuantity) }));
      
      // Nếu số lượng hiện tại chưa bằng maxQuantity, cho phép cập nhật về maxQuantity
      if (item.quantity < item.maxQuantity) {
        const delta = item.maxQuantity - item.quantity;
        await handleQuantityChange(id, delta);
      }
      return;
    } else {
      // Xóa lỗi nếu nhập lại trong ngưỡng
      setQuantityErrors((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    if (newQuantity === item.quantity) {
      // Reset input về số lượng hiện tại nếu không thay đổi
      setQuantityInputValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    const delta = newQuantity - item.quantity;
    await handleQuantityChange(id, delta);
    
    // Xóa giá trị input tạm thời sau khi cập nhật thành công
    setQuantityInputValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleRemoveItem = async (id) => {
    try {
      const item = cartItems.find(i => i.id === id);
      if (!item) {
        console.warn('[Cart] Item not found:', id);
        return;
      }
      
      console.log('[Cart] Removing item:', { id, productId: item.productId, quantity: item.quantity });
      
      // Optimistic update: xóa item ngay lập tức
      const updatedItems = cartItems.filter(i => i.id !== id);
      setCartItems(updatedItems);
      
      // Xóa bằng cách thêm với quantity âm bằng với số lượng hiện tại
      // Backend sẽ tự động xóa item khi quantity về 0 hoặc âm
      await cartService.addItem(item.productId, -item.quantity, item.colorCode || null);
      
      // Reload lại cart để đồng bộ với backend (sẽ tự động cập nhật subtotal và total)
      await loadCart(true, true);
      
      // Dispatch event để cập nhật cart count trong header
      window.dispatchEvent(
        new CustomEvent('cartUpdated', { detail: { source: 'cart-page' } }),
      );
    } catch (error) {
      console.error('[Cart] Error removing item:', error);
      // Nếu có lỗi, reload lại cart để khôi phục state
      await loadCart(true, true);
      notify.error(error.message || 'Không thể xóa sản phẩm. Vui lòng thử lại.');
    }
  };

  // Áp dụng mã giảm giá (dùng chung cho nhập tay và chọn gợi ý)
  const applyVoucherCode = async (code) => {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      notify.warning('Vui lòng nhập mã giảm giá');
      return;
    }

    // Kiểm tra xem có sản phẩm nào được chọn không
    const selectedItemsForVoucher = cartItems.filter((item) => item.selected);
    if (selectedItemsForVoucher.length === 0) {
      notify.warning('Vui lòng chọn ít nhất một sản phẩm để áp dụng mã giảm giá');
      return;
    }

    try {
      await applyVoucher(trimmed);
      setDiscountCode('');
    } catch (error) {
      console.error('Error applying voucher:', error);
      notify.error(error.message || 'Không thể áp dụng mã giảm giá. Vui lòng thử lại.');
    }
  };

  const handleApplyDiscount = async () => {
    await applyVoucherCode(discountCode);
  };

  const handleApplySuggestedVoucher = async (code) => {
    await applyVoucherCode(code);
  };

  const handleClearVoucher = async () => {
    try {
      await clearVoucher();
      setDiscountCode('');
    } catch (error) {
      console.error('Error clearing voucher:', error);
      notify.error(error.message || 'Không thể xóa mã giảm giá. Vui lòng thử lại.');
    }
  };

  const selectedItems = cartItems.filter((item) => item.selected);
  const allSelected = cartItems.length > 0 && cartItems.every((item) => item.selected);
  const selectedCount = selectedItems.length;

  // Tính lại subtotal và total từ selected items
  const calculatedSubtotal = selectedItems.reduce(
    (sum, item) => sum + (item.finalPrice || item.currentPrice * item.quantity),
    0
  );
  // Chỉ áp dụng giảm giá khi có sản phẩm được chọn, và không cho total âm
  const effectiveDiscount = selectedItems.length > 0 ? appliedDiscount : 0;
  const calculatedTotal = Math.max(0, calculatedSubtotal - effectiveDiscount);

  // Gợi ý mã giảm giá dựa trên sản phẩm đã chọn
  useEffect(() => {
    const loadSuggestedVouchers = async () => {
      try {
        // Nếu chưa chọn sản phẩm nào thì không cần gợi ý
        if (!selectedItems.length || calculatedSubtotal <= 0) {
          setSuggestedVouchers([]);
          return;
        }

        const vouchersData = await getActiveVouchers().catch(() => []);
        const vouchers = Array.isArray(vouchersData) ? vouchersData : [];

        // Lọc các voucher đã được duyệt, đang hoạt động và có thể áp dụng cho giá trị đơn hiện tại
        const applicableVouchers = vouchers.filter((voucher) => {
          if (voucher.status !== 'APPROVED' || voucher.isActive !== true) return false;

          // Chỉ gợi ý loại áp dụng cho đơn hàng
          if (voucher.applyScope && voucher.applyScope !== 'ORDER') return false;

          // Nếu yêu cầu giá trị đơn tối thiểu thì phải đạt
          if (voucher.minOrderValue && Number(voucher.minOrderValue) > 0) {
            return calculatedSubtotal >= Number(voucher.minOrderValue);
          }

          return true;
        });

        setSuggestedVouchers(applicableVouchers.slice(0, 5));
      } catch (error) {
        console.error('[Cart] Error loading suggested vouchers:', error);
        setSuggestedVouchers([]);
      }
    };

    loadSuggestedVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedSubtotal, selectedItems.length]);

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
                      <div className={cx('quantityCell')}>
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
                            value={quantityInputValues[item.id] !== undefined ? quantityInputValues[item.id] : item.quantity}
                            onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                            onBlur={(e) => {
                              // Reset về số lượng hiện tại khi blur
                              setQuantityInputValues((prev) => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                            className={cx('quantityInput')}
                            min="1"
                            max={item.maxQuantity != null ? item.maxQuantity : undefined}
                          />
                          <button
                            type="button"
                            className={cx('quantityBtn')}
                            onClick={() => handleQuantityChange(item.id, 1)}
                            disabled={item.maxQuantity != null && item.quantity >= item.maxQuantity}
                          >
                            <FontAwesomeIcon icon={faPlus} />
                          </button>
                        </div>
                        {quantityErrors[item.id] && (
                          <div className={cx('quantityError')}>{quantityErrors[item.id]}</div>
                        )}
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
          {suggestedVouchers.length > 0 && !appliedVoucherCode && (
            <div className={cx('suggestedVouchers')}>
              <p className={cx('suggestedTitle')}>
                Gợi ý mã giảm giá có thể áp dụng cho các sản phẩm đã chọn:
              </p>
              <div className={cx('suggestedList')}>
                {suggestedVouchers.map((voucher) => (
                  <button
                    key={voucher.id}
                    type="button"
                    className={cx('suggestedItem')}
                    onClick={() => handleApplySuggestedVoucher(voucher.code || '')}
                    title={voucher.description || voucher.name || 'Mã giảm giá'}
                  >
                    <span className={cx('suggestedCode')}>{voucher.code}</span>
                    {voucher.discountValue && (
                      <span className={cx('suggestedInfo')}>
                        {voucher.discountValueType === 'PERCENTAGE'
                          ? `Giảm ${voucher.discountValue}%`
                          : `Giảm ${new Intl.NumberFormat('vi-VN').format(
                              voucher.discountValue
                            )}₫`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {appliedVoucherCode && selectedItems.length > 0 && (
            <div className={cx('appliedVoucher')}>
              <span className={cx('appliedVoucherText')}>
                Đã áp dụng: <strong>{appliedVoucherCode}</strong>
              </span>
              <button
                type="button"
                className={cx('removeVoucherBtn')}
                onClick={handleClearVoucher}
                title="Xóa mã giảm giá"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          )}
        </div>

        <div className={cx('orderSummary')}>
          <div className={cx('summaryRow')}>
            <span>Tạm tính:</span>
            <span>{formatPrice(calculatedSubtotal)}</span>
          </div>
          {appliedDiscount > 0 && selectedItems.length > 0 && (
            <div className={cx('summaryRow')}>
              <span>Giảm giá:</span>
              <span className={cx('discountAmount')}>-{formatPrice(effectiveDiscount)}</span>
            </div>
          )}
          <div className={cx('summaryRow', 'totalRow')}>
            <span>Tổng cộng (đã gồm VAT):</span>
            <span className={cx('totalAmount')}>{formatPrice(calculatedTotal)}</span>
          </div>
          <button
            type="button"
            className={cx('btn', 'btnBuy', { disabled: selectedItems.length === 0 })}
            onClick={handleCheckout}
          >
            MUA HÀNG
          </button>
          <p className={cx('vatNote')}>(Giá hiển thị đã bao gồm VAT)</p>
        </div>
      </div>
    </div>
  );
}

export default Cart;
