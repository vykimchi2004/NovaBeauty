import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../CheckoutPage.module.scss';
import { getMyInfo } from '~/services/user';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import notify from '~/utils/notification';
import { useCart, useAddress } from '~/hooks';
import orderService from '~/services/order';
import { setDefaultAddress, formatFullAddress } from '~/services/address';

const cx = classNames.bind(styles);

function CheckoutDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Danh sách cartItemId được chọn truyền từ trang giỏ hàng
  const selectedItemIds = location.state?.selectedItemIds || [];

  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('momo'); // 'momo' | 'cod'
  const [shippingMethod, setShippingMethod] = useState('ghn_standard'); // hiện tại chỉ 1 lựa chọn
  const [orderNote, setOrderNote] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [shouldRefreshShippingFee, setShouldRefreshShippingFee] = useState(false);

  // Use cart hook
  const {
    cartItems,
    loading: cartLoading,
    subtotal: cartSubtotal,
    total: cartTotal,
    appliedDiscount: voucherDiscount,
  } = useCart({ autoLoad: true, listenToEvents: false });

  // Lọc ra các item được chọn thanh toán (phải khai báo trước khi dùng trong useAddress)
  const checkoutItems = useMemo(() => {
    if (!selectedItemIds.length) return cartItems;
    const idSet = new Set(selectedItemIds);
    const filtered = cartItems.filter((item) => idSet.has(item.id));
    return filtered.length > 0 ? filtered : cartItems;
  }, [cartItems, selectedItemIds]);

  // Calculate totalWeight and subtotal for address hook
  const totalWeight = useMemo(
    () =>
      checkoutItems.reduce((sum, item) => {
        const qty = item.quantity || 1;
        // Tạm ước lượng 500g / sản phẩm
        return sum + qty * 500;
      }, 0),
    [checkoutItems],
  );

  const subtotalForAddress = useMemo(
    () =>
      checkoutItems.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        const lineTotal =
          typeof item.finalPrice === 'number'
            ? item.finalPrice
            : (item.currentPrice || 0) * quantity;
        return sum + lineTotal;
      }, 0),
    [checkoutItems],
  );

  // Use address hook
  const {
    savedAddresses,
    selectedAddressId,
    setSelectedAddressId,
    fullName,
    setFullName,
    phone,
    setPhone,
    address,
    setAddress,
    detailAddress,
    setDetailAddress,
    provinces,
    districts,
    wards,
    selectedProvinceId,
    setSelectedProvinceId,
    selectedDistrictId,
    setSelectedDistrictId,
    selectedWardCode,
    setSelectedWardCode,
    selectedProvinceName,
    selectedDistrictName,
    selectedWardName,
    showProvinceDropdown,
    setShowProvinceDropdown,
    showDistrictDropdown,
    setShowDistrictDropdown,
    showWardDropdown,
    setShowWardDropdown,
    ghnAvailable,
    addressError,
    setAddressError,
    phoneError,
    setPhoneError,
    shippingFee,
    shippingFeeLoading,
    provinceDropdownRef,
    districtDropdownRef,
    wardDropdownRef,
    loadAddresses,
    loadProvinces,
    selectSavedAddress,
    saveAddress,
    resetForm,
    handleSelectProvince,
    handleSelectDistrict,
    toggleProvinceDropdown,
    toggleDistrictDropdown,
    toggleWardDropdown,
  } = useAddress({
    totalWeight,
    subtotal: subtotalForAddress,
    totalAfterDiscount: subtotalForAddress - voucherDiscount,
    autoLoadAddresses: false, // We'll load manually after user info is loaded
  });

  // Đảm bảo đã đăng nhập
  useEffect(() => {
    const token = storage.get(STORAGE_KEYS.TOKEN, null);
    if (!token) {
      notify.warning('Vui lòng đăng nhập để thanh toán.');
      navigate('/profile', { replace: true });
    }
  }, [navigate]);

  // Load thông tin user và địa chỉ
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        // Lấy user từ cache nếu có
        const cachedUser = storage.get(STORAGE_KEYS.USER, null);
        let userInfo = cachedUser;
        if (!userInfo) {
          userInfo = await getMyInfo();
        }

        // Load addresses
        const addressesData = await loadAddresses();

        if (!isMounted) return;

        const name = userInfo?.fullName || userInfo?.name || '';
        const phoneNumber = userInfo?.phone ?? userInfo?.phoneNumber ?? '';

        setFullName(name);
        setPhone(phoneNumber);

        // Tự động chọn địa chỉ mặc định nếu có
        if (Array.isArray(addressesData) && addressesData.length > 0) {
          const defaultAddr = addressesData.find((addr) => addr.defaultAddress);
          const selectedAddr = defaultAddr || addressesData[0];
          
          if (selectedAddr) {
            setSelectedAddress(selectedAddr);
            await selectSavedAddress(selectedAddr);
            setShouldRefreshShippingFee(true);
            // Override với user info nếu address không có
            if (!selectedAddr.recipientName) {
              setFullName(name);
            }
            if (!selectedAddr.recipientPhoneNumber) {
              setPhone(phoneNumber);
            }
          }
        } else {
          // Fallback về địa chỉ cũ từ user nếu không có địa chỉ đã lưu
          const addr = userInfo?.address || '';
          setAddress(addr);
          if (addr) {
            setDetailAddress(addr);
          }
        }
      } catch (error) {
        console.error('[CheckoutDetailPage] Error loading data:', error);
        notify.error('Không thể tải thông tin thanh toán. Vui lòng thử lại.');
        navigate('/cart', { replace: true });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [navigate, loadAddresses, selectSavedAddress]);

  // Load danh sách tỉnh từ GHN khi mở modal lần đầu
  useEffect(() => {
    if (showAddressModal && provinces.length === 0) {
      loadProvinces();
    }
  }, [showAddressModal, provinces.length, loadProvinces]);

  // Tính lại shipping fee khi selectedAddress thay đổi
  useEffect(() => {
    if (shouldRefreshShippingFee && selectedAddress) {
      // useAddress hook sẽ tự động tính lại shipping fee khi selectSavedAddress được gọi
      // Nhưng chúng ta cần đảm bảo nó được trigger
      setShouldRefreshShippingFee(false);
    }
  }, [shouldRefreshShippingFee, selectedAddress]);

  const subtotal = useMemo(
    () =>
      checkoutItems.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        const lineTotal =
          typeof item.finalPrice === 'number'
            ? item.finalPrice
            : (item.currentPrice || 0) * quantity;
        return sum + lineTotal;
      }, 0),
    [checkoutItems],
  );

  const total = Math.max(0, subtotal + shippingFee - voucherDiscount);

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(Number(price) || 0)) + ' ₫';

  // Sử dụng selectedAddress nếu có, fallback về address từ useAddress hook
  const addressText = selectedAddress
    ? formatFullAddress(selectedAddress)
    : address || 'Vui lòng cập nhật địa chỉ giao hàng';
  
  const recipientName = selectedAddress?.recipientName || fullName || 'Khách hàng';
  const recipientPhone = selectedAddress?.recipientPhoneNumber || phone || '---';

  const hasShippingInfo = useMemo(() => {
    if (selectedAddress) {
      const requiredFields = [
        selectedAddress.recipientName,
        selectedAddress.recipientPhoneNumber || selectedAddress.recipientPhone,
        selectedAddress.address,
        selectedAddress.wardCode,
        selectedAddress.districtID,
      ];
      return requiredFields.every((value) => value && String(value).trim().length > 0);
    }
    return address && address.trim().length > 0;
  }, [selectedAddress, address]);

  const canPlaceOrder = hasShippingInfo && checkoutItems.length > 0;


  const paymentMethodLabel =
    paymentMethod === 'momo'
      ? 'MOMO (Thanh toán online)'
      : 'COD — Thanh toán khi nhận hàng';

  const shippingMethodLabel =
    shippingMethod === 'ghn_standard' ? 'Giao hàng GHN (Tiêu chuẩn)' : 'Phương thức khác';

  const handleBackToCart = () => {
    navigate('/cart');
  };

  const handlePlaceOrder = async () => {
    if (!checkoutItems.length) {
      notify.warning('Không có sản phẩm nào để thanh toán.');
      navigate('/cart');
      return;
    }

    if (!hasShippingInfo) {
      notify.warning('Vui lòng nhập địa chỉ giao hàng trước khi đặt hàng.');
      setShowAddressModal(true);
      return;
    }

    if (placingOrder) return;

    // Chuẩn bị dữ liệu tóm tắt
    const summaryItems = checkoutItems.map((item) => {
      const quantity = item.quantity || 1;
      const lineTotal =
        typeof item.finalPrice === 'number'
          ? item.finalPrice
          : (item.currentPrice || 0) * quantity;
      return {
        id: item.id,
        name: item.productName || item.name || 'Sản phẩm',
        quantity,
        lineTotal,
      };
    });

    // Build shipping address JSON - ưu tiên selectedAddress
    const finalRecipientName = selectedAddress?.recipientName || fullName;
    const finalRecipientPhone = selectedAddress?.recipientPhoneNumber || phone;
    const finalAddressText = selectedAddress ? formatFullAddress(selectedAddress) : address;
    
    const shippingAddressJson = JSON.stringify({
      name: finalRecipientName,
      phone: finalRecipientPhone,
      address: finalAddressText,
    });

    setPlacingOrder(true);
    try {
      const request = {
        shippingAddress: shippingAddressJson,
        addressId: selectedAddress?.id || selectedAddress?.addressId || selectedAddressId || null,
        note: orderNote || null,
        shippingFee: shippingFee || 0,
        cartItemIds: selectedItemIds && selectedItemIds.length > 0 ? selectedItemIds : null,
        paymentMethod: paymentMethod || 'cod',
      };

      const result = await orderService.createOrder(request);
      
      console.log('[CheckoutDetailPage] Order creation result:', result);
      
      // Kiểm tra cấu trúc response
      if (!result) {
        throw new Error('Không nhận được phản hồi từ server.');
      }
      
      // Dispatch event để cập nhật giỏ hàng (backend đã xóa các items đã đặt hàng)
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { source: 'order-placement' } }));
      
      // Nếu là COD, chuyển sang trang thank you
      if (paymentMethod === 'cod') {
        // result có thể là CheckoutInitResponse { order, payUrl } hoặc trực tiếp là order object
        const orderData = result.order || result;
        
        if (!orderData) {
          console.error('[CheckoutDetailPage] Invalid order data:', result);
          throw new Error('Dữ liệu đơn hàng không hợp lệ.');
        }
        
        // Chuyển sang trang thank you với thông tin đơn hàng
        navigate('/order-success', {
          state: {
            order: orderData,
            items: summaryItems,
            fullName: fullName,
            address: address,
            total: total,
            paymentMethod: paymentMethod,
            subtotal: subtotal,
            shippingFee: shippingFee,
            voucherDiscount: voucherDiscount,
          },
        });
      } else if (paymentMethod === 'momo') {
        // Nếu là MoMo, kiểm tra payUrl và redirect đến trang thanh toán MoMo ngay
        if (result.payUrl) {
          // Redirect đến trang thanh toán MoMo
          window.location.href = result.payUrl;
        } else {
          notify.error('Không thể lấy link thanh toán MoMo. Vui lòng thử lại.');
          setPlacingOrder(false);
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
      notify.error(error.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      setPlacingOrder(false);
    }
    // Note: Không set placingOrder = false ở đây vì nếu là MoMo, sẽ redirect ngay
  };

  const handleProvinceSelect = (value) => {
    handleSelectProvince(value);
    setShowProvinceDropdown(false);
  };

  const handleDistrictSelect = (value) => {
    handleSelectDistrict(value);
    setShowDistrictDropdown(false);
  };

  const handleWardSelect = (value) => {
    setSelectedWardCode(value);
    setShowWardDropdown(false);
  };

  const handleSelectSavedAddress = async (addr) => {
    setSelectedAddress(addr);
    await selectSavedAddress(addr);
    setShowAddressModal(false);
    setShouldRefreshShippingFee(true);
    setAddressRefreshKey((prev) => prev + 1);
  };

  const handleSetDefaultAddress = async (addr, e) => {
    e.stopPropagation(); // Ngăn chặn event bubble lên parent div
    
    // Backend trả về 'id' trong AddressResponse (mapped từ addressId)
    const addressId = addr.id || addr.addressId || addr.address_id;
    
    if (!addressId) {
      console.error('Address ID not found:', addr);
      notify.error('Không tìm thấy ID địa chỉ. Vui lòng thử lại.');
      return;
    }
    
    try {
      await setDefaultAddress(addressId);
      notify.success('Đã đặt làm địa chỉ mặc định thành công.');
      // Reload danh sách địa chỉ
      const updatedAddresses = await loadAddresses();
      // Tự động chọn lại địa chỉ vừa đặt làm mặc định
      const updatedAddr = updatedAddresses.find((a) => {
        const aId = a.id || a.addressId || a.address_id;
        return aId === addressId;
      });
      if (updatedAddr) {
        await selectSavedAddress(updatedAddr);
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      notify.error(error.message || 'Không thể đặt làm địa chỉ mặc định. Vui lòng thử lại.');
    }
  };

  const handleSaveAddress = async () => {
    const success = await saveAddress(isDefaultAddress);
    if (success) {
      // Reload danh sách địa chỉ sau khi lưu thành công
      const updatedAddresses = await loadAddresses();
      // Tự động chọn địa chỉ vừa tạo
      if (updatedAddresses && updatedAddresses.length > 0) {
        const newAddr = updatedAddresses[0]; // Địa chỉ mới nhất
        setSelectedAddress(newAddr);
        await selectSavedAddress(newAddr);
        setShouldRefreshShippingFee(true);
      }
      setAddressRefreshKey((prev) => prev + 1);
      setShowAddressModal(false);
      setShowAddAddressForm(false);
      setIsDefaultAddress(false);
      resetForm();
    }
  };

  if (loading || cartLoading) {
    return (
      <div className={cx('container')}>
        <div className={cx('cartSection')}>
          <div className={cx('loading')}>Đang tải thông tin thanh toán...</div>
        </div>
      </div>
    );
  }

  if (!checkoutItems.length) {
    return (
      <div className={cx('container')}>
        <div className={cx('cartSection')}>
          <p>Không có sản phẩm nào để thanh toán.</p>
          <button
            type="button"
            className={cx('btn', 'btnApply')}
            onClick={handleBackToCart}
          >
            Quay lại giỏ hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cx('container')}>
      {/* Trái: Thông tin vận chuyển + thanh toán + sản phẩm */}
      <div className={cx('cartSection')}>
        <div className={cx('cartHeader')}>
          <h2 className={cx('cartTitle')}>Thông tin vận chuyển</h2>
          <button
            type="button"
            className={cx('linkButton')}
            onClick={() => setShowAddressModal(true)}
          >
            Thay đổi
          </button>
        </div>

        {/* Địa chỉ giao hàng */}
        <div className={cx('checkoutAddressWrapper')}>
          <div className={cx('checkoutAddress', !hasShippingInfo && 'noAddress')}>
            <div className={cx('checkoutAddressContent')}>
              {hasShippingInfo ? (
                <>
                  <div className={cx('checkoutAddressName')}>
                    {recipientName || 'Chưa có tên'} - {recipientPhone || 'Chưa có số điện thoại'}
                  </div>
                  <div className={cx('checkoutAddressLine')}>{addressText}</div>
                </>
              ) : (
                <p className={cx('checkoutAddressLine')}>
                  Bạn chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ để tiếp tục thanh toán.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Phương thức giao hàng */}
        <div className={cx('section')}>
          <h3 className={cx('sectionTitle')}>Phương thức giao hàng</h3>
          <div className={cx('paymentSummaryRow')}>
            <div className={cx('paymentSummaryInfo')}>
              <div className={cx('paymentSummaryLabel')}>Đơn vị vận chuyển</div>
              <div className={cx('paymentSummaryValue')}>{shippingMethodLabel}</div>
              <div className={cx('shippingMethodSub')}>
                Phí dự kiến: {formatPrice(shippingFee)} — Dự kiến giao: 3-5 ngày
              </div>
            </div>
            <button
              type="button"
              className={cx('btn', 'btnOutline', 'paymentSummaryButton')}
              onClick={() => setShowShippingModal(true)}
            >
              Thay đổi
            </button>
          </div>
        </div>

        {/* Phương thức thanh toán */}
        <div className={cx('section')}>
          <h3 className={cx('sectionTitle')}>Phương thức thanh toán</h3>
          <div className={cx('paymentSummaryRow')}>
            <div className={cx('paymentSummaryInfo')}>
              <div className={cx('paymentSummaryLabel')}>Phương thức hiện tại</div>
              <div className={cx('paymentSummaryValue')}>{paymentMethodLabel}</div>
            </div>
            <button
              type="button"
              className={cx('btn', 'btnOutline', 'paymentSummaryButton')}
              onClick={() => setShowPaymentModal(true)}
            >
              Thay đổi
            </button>
          </div>
          <p className={cx('paymentSummaryHint')}>
            Bạn có thể thay đổi phương thức thanh toán bằng cách nhấn nút &quot;Chọn&quot;
            bên phải.
          </p>
        </div>

        {/* Ghi chú đơn hàng */}
        <div className={cx('section')}>
          <h3 className={cx('sectionTitle')}>Ghi chú đơn hàng</h3>
          <textarea
            className={cx('orderNote')}
            placeholder="Ghi chú cho người giao hàng (ví dụ: gọi trước khi giao)"
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
          />
        </div>

        {/* Sản phẩm đã chọn */}
        <div className={cx('section')}>
          <div className={cx('productsHeader')}>
            <h3 className={cx('sectionTitle')}>Sản phẩm</h3>
            <span className={cx('productsCount')}>
              {checkoutItems.length} sản phẩm
            </span>
          </div>
          <div className={cx('productsList')}>
            {checkoutItems.map((item) => {
              const quantity = item.quantity || 1;
              const lineTotal =
                typeof item.finalPrice === 'number'
                  ? item.finalPrice
                  : (item.unitPrice || 0) * quantity;
              return (
                <div key={item.id} className={cx('productRow')}>
                  <div className={cx('productInfoCol')}>
                    <div className={cx('productName')}>
                      {item.productName || item.name || 'Sản phẩm'}
                    </div>
                    <div className={cx('productMeta')}>Số lượng: {quantity}</div>
                  </div>
                  <div className={cx('productPriceCol')}>
                    <span className={cx('productLinePrice')}>
                      {formatPrice(lineTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popup chọn phương thức giao hàng */}
      {showShippingModal && (
        <div className={cx('paymentModalOverlay')}>
          <div className={cx('paymentModal')}>
            <h3 className={cx('paymentModalTitle')}>Chọn phương thức giao hàng</h3>
            <p className={cx('paymentHint')}>
              Vui lòng chọn đơn vị vận chuyển phù hợp cho đơn hàng của bạn.
            </p>

            <div className={cx('shippingMethods')}>
              <label
                className={cx(
                  'shippingMethodOption',
                  shippingMethod === 'ghn_standard' && 'active',
                )}
              >
                <input
                  type="radio"
                  name="shippingMethod"
                  value="ghn_standard"
                  checked={shippingMethod === 'ghn_standard'}
                  onChange={() => setShippingMethod('ghn_standard')}
                />
                <div className={cx('shippingMethodContent')}>
                  <span className={cx('shippingMethodName')}>
                    Giao hàng GHN (Tiêu chuẩn)
                  </span>
                  <span className={cx('shippingMethodSub')}>
                    Phí dự kiến: {formatPrice(shippingFee)} — Dự kiến giao: 3-5 ngày
                  </span>
                </div>
              </label>
            </div>

            <div className={cx('addressFormActions')}>
              <button
                type="button"
                className={cx('btn', 'btnCancelAddress')}
                onClick={() => setShowShippingModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={cx('btn', 'btnPrimary')}
                onClick={() => setShowShippingModal(false)}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup chọn phương thức thanh toán */}
      {showPaymentModal && (
        <div className={cx('paymentModalOverlay')}>
          <div className={cx('paymentModal')}>
            <h3 className={cx('paymentModalTitle')}>Chọn phương thức thanh toán</h3>
            <p className={cx('paymentHint')}>
              Vui lòng chọn 1 trong các phương thức bên dưới để hoàn tất thanh toán đơn hàng.
            </p>

            <div className={cx('paymentMethods')}>
              <label className={cx('paymentMethod', paymentMethod === 'momo' && 'active')}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'momo'}
                  onChange={() => setPaymentMethod('momo')}
                />
                <div>
                  <span className={cx('paymentMethodName')}>
                    MOMO (Thanh toán online)
                  </span>
                  <p className={cx('paymentMethodSub')}>
                    Sử dụng ví MoMo để quét mã hoặc thanh toán trực tuyến. Xác nhận tự động.
                  </p>
                </div>
              </label>
              <label className={cx('paymentMethod', paymentMethod === 'cod' && 'active')}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <div>
                  <span className={cx('paymentMethodName')}>
                    COD — Thanh toán khi nhận hàng
                  </span>
                  <p className={cx('paymentMethodSub')}>
                    Thanh toán trực tiếp cho nhân viên giao hàng khi nhận được sản phẩm.
                  </p>
                </div>
              </label>
            </div>

            <div className={cx('addressFormActions')}>
              <button
                type="button"
                className={cx('btn', 'btnCancelAddress')}
                onClick={() => setShowPaymentModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={cx('btn', 'btnPrimary')}
                onClick={() => setShowPaymentModal(false)}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phải: Tóm tắt đơn hàng */}
      <div className={cx('summarySection')}>
        <div className={cx('orderSummary')}>
          <div className={cx('summaryRow')}>
            <span>Tạm tính</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className={cx('summaryRow')}>
            <span>Phí vận chuyển (GHN)</span>
            <span>{formatPrice(shippingFee)}</span>
          </div>
          {voucherDiscount > 0 && (
            <div className={cx('summaryRow')}>
              <span>Giảm giá</span>
              <span className={cx('discountAmount')}>
                -{formatPrice(voucherDiscount)}
              </span>
            </div>
          )}
          <div className={cx('summaryRow', 'totalRow')}>
            <span>Tổng cộng (đã gồm VAT)</span>
            <span className={cx('totalAmount')}>{formatPrice(total)}</span>
          </div>
          <button
            type="button"
            className={cx('btn', 'btnBuy')}
            onClick={handlePlaceOrder}
            disabled={!canPlaceOrder || placingOrder}
          >
            {placingOrder ? 'Đang xử lý...' : 'Thanh toán'}
          </button>
          {!hasShippingInfo && (
            <p className={cx('missingAddressMsg')}>
              Bạn cần nhập địa chỉ giao hàng để tiếp tục.
            </p>
          )}
        </div>
      </div>

      {/* Popup thêm / sửa địa chỉ với GHN */}
      {showAddressModal && (
        <div className={cx('addressModalOverlay')} onClick={() => {
          setShowAddressModal(false);
          setShowAddAddressForm(false);
        }}>
          <div
            className={cx('addressModal')}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <h3 className={cx('addressModalTitle')}>Địa chỉ giao hàng</h3>
            
            {!showAddAddressForm ? (
              <>
                {/* Danh sách địa chỉ đã lưu */}
                {savedAddresses.length > 0 ? (
                  <div className={cx('savedAddressesList')}>
                    {savedAddresses.map((addr) => {
                      // Build địa chỉ đầy đủ từ các field sử dụng formatFullAddress
                      const fullAddr = formatFullAddress(addr);
                      
                      // Backend trả về 'id' trong AddressResponse (mapped từ addressId)
                      const addressId = String(addr.id || addr.addressId || addr.address_id || '');
                      const isSelected = selectedAddress?.id === addr.id || 
                                        selectedAddress?.addressId === addr.addressId ||
                                        String(selectedAddressId || '') === addressId;
                      
                      return (
                        <div
                          key={addressId}
                          className={cx(
                            'savedAddressItem',
                            isSelected && 'active',
                          )}
                          onClick={() => handleSelectSavedAddress(addr)}
                        >
                          <div className={cx('savedAddressContent')}>
                            <div className={cx('savedAddressHeader')}>
                              <span className={cx('savedAddressName')}>
                                {addr.recipientName || 'Chưa có tên'}
                              </span>
                              {addr.defaultAddress && (
                                <span className={cx('defaultBadge')}>MẶC ĐỊNH</span>
                              )}
                            </div>
                            <div className={cx('savedAddressPhone')}>
                              {addr.recipientPhoneNumber || 'Chưa có số điện thoại'}
                            </div>
                            <div className={cx('savedAddressLine')}>
                              {fullAddr || 'Chưa có địa chỉ'}
                            </div>
                            {!addr.defaultAddress && (
                              <button
                                type="button"
                                className={cx('setDefaultBtn')}
                                onClick={(e) => handleSetDefaultAddress(addr, e)}
                              >
                                Đặt làm mặc định
                              </button>
                            )}
                          </div>
                          <input
                            type="radio"
                            name="selectedAddress"
                            value={addressId}
                            checked={isSelected}
                            onChange={() => handleSelectSavedAddress(addr)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={cx('addressHint')} style={{ marginBottom: '16px', textAlign: 'center', color: '#6b7280' }}>
                    Bạn chưa có địa chỉ nào. Vui lòng thêm địa chỉ mới.
                  </p>
                )}

                <div className={cx('addressFormActions')}>
                  <button
                    type="button"
                    className={cx('btn', 'btnCancelAddress')}
                    onClick={() => {
                      setShowAddressModal(false);
                      setShowAddAddressForm(false);
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className={cx('btn', 'btnPrimary')}
                    onClick={() => setShowAddAddressForm(true)}
                  >
                    Thêm địa chỉ mới
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p className={cx('addressHint')} style={{ margin: 0 }}>
                    {ghnAvailable
                      ? 'Địa chỉ được xác định theo dữ liệu khu vực của GHN. Vui lòng chọn Tỉnh/Thành phố, Quận/Huyện, Phường/Xã và nhập số nhà, tên đường thật chính xác.'
                      : 'Hiện không kết nối được dịch vụ GHN. Bạn vẫn có thể nhập đầy đủ địa chỉ giao hàng theo dạng: Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành.'}
                  </p>
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      className={cx('btn', 'btnCancelAddress')}
                      onClick={() => setShowAddAddressForm(false)}
                      style={{ whiteSpace: 'nowrap', marginLeft: '12px' }}
                    >
                      Quay lại
                    </button>
                  )}
                </div>

                <div className={cx('addressForm')}>
              <div className={cx('addressFormRow')}>
                <input
                  type="text"
                  placeholder="Họ và tên người nhận"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {ghnAvailable ? (
                <>
                  <div className={cx('addressFormRow')}>
                    <div
                      className={cx(
                        'addressDropdown',
                        !selectedProvinceId && 'addressDropdownPlaceholder',
                      )}
                      ref={provinceDropdownRef}
                    >
                      <button
                        type="button"
                        className={cx('addressDropdownButton')}
                        onClick={toggleProvinceDropdown}
                        disabled={!provinces.length}
                      >
                        {selectedProvinceName || 'Chọn tỉnh / thành phố'}
                        <span className={cx('addressDropdownIcon')} />
                      </button>
                      {showProvinceDropdown && (
                        <div className={cx('addressDropdownList')}>
                          {provinces.map((p) => (
                            <button
                              type="button"
                              key={p.ProvinceID || p.id}
                              className={cx('addressDropdownOption')}
                              onClick={() => handleProvinceSelect(String(p.ProvinceID || p.id))}
                            >
                              {p.ProvinceName || p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div
                      className={cx(
                        'addressDropdown',
                        (!selectedDistrictId || !districts.length) &&
                          'addressDropdownPlaceholder',
                        !selectedProvinceId && 'addressDropdownDisabled',
                      )}
                      ref={districtDropdownRef}
                    >
                      <button
                        type="button"
                        className={cx('addressDropdownButton')}
                        onClick={toggleDistrictDropdown}
                        disabled={!selectedProvinceId || !districts.length}
                      >
                        {selectedDistrictName || 'Chọn quận / huyện'}
                        <span className={cx('addressDropdownIcon')} />
                      </button>
                      {showDistrictDropdown && (
                        <div className={cx('addressDropdownList')}>
                          {districts.map((d) => (
                            <button
                              type="button"
                              key={d.DistrictID || d.id}
                              className={cx('addressDropdownOption')}
                              onClick={() => handleDistrictSelect(String(d.DistrictID || d.id))}
                            >
                              {d.DistrictName || d.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={cx('addressFormRow')}>
                    <div
                      className={cx(
                        'addressDropdown',
                        (!selectedWardCode || !wards.length) && 'addressDropdownPlaceholder',
                        !selectedDistrictId && 'addressDropdownDisabled',
                      )}
                      ref={wardDropdownRef}
                    >
                      <button
                        type="button"
                        className={cx('addressDropdownButton')}
                        onClick={toggleWardDropdown}
                        disabled={!selectedDistrictId || !wards.length}
                      >
                        {selectedWardName || 'Chọn phường / xã'}
                        <span className={cx('addressDropdownIcon')} />
                      </button>
                      {showWardDropdown && (
                        <div className={cx('addressDropdownList')}>
                          {wards.map((w) => (
                            <button
                              type="button"
                              key={w.WardCode || w.code}
                              className={cx('addressDropdownOption')}
                              onClick={() => handleWardSelect(String(w.WardCode || w.code))}
                            >
                              {w.WardName || w.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Số nhà, tên đường..."
                      value={detailAddress}
                      onChange={(e) => setDetailAddress(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className={cx('addressFormRow')}>
                  <input
                    type="text"
                    placeholder="Nhập đầy đủ địa chỉ: Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                  />
                </div>
              )}

              {(addressError || phoneError) && (
                <div className={cx('addressErrors')}>
                  {addressError && <p>{addressError}</p>}
                  {phoneError && <p>{phoneError}</p>}
                </div>
              )}

              <label className={cx('defaultAddressCheckbox')}>
                <input
                  type="checkbox"
                  checked={isDefaultAddress}
                  onChange={(e) => setIsDefaultAddress(e.target.checked)}
                />
                <span>Đặt làm địa chỉ mặc định</span>
              </label>

              <div className={cx('addressFormActions')}>
                <button
                  type="button"
                  className={cx('btn', 'btnCancelAddress')}
                  onClick={() => {
                    setShowAddressModal(false);
                    setShowAddAddressForm(false);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={cx('btn', 'btnApply')}
                  onClick={handleSaveAddress}
                >
                  Lưu địa chỉ
                </button>
              </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckoutDetailPage;


