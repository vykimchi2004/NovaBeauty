import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Cart.module.scss';
import cartService from '~/services/cart';
import notify from '~/utils/notification';
import { getMyAddresses, createAddress, getProvinces, getDistricts, getWards } from '~/services/address';

const cx = classNames.bind(styles);

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartSummary, setCartSummary] = useState({ subtotal: 0, totalAmount: 0, voucherDiscount: 0 });
  const [selectedItems, setSelectedItems] = useState([]);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    recipientName: '',
    recipientPhoneNumber: '',
    provinceName: '',
    districtName: '',
    wardName: '',
    address: '',
    postalCode: '',
    defaultAddress: false,
  });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [cart, myAddresses, provs] = await Promise.all([
          cartService.getCart(),
          getMyAddresses().catch((err) => {
            console.error('[Checkout] Error loading addresses:', err);
            return [];
          }),
          getProvinces().catch((err) => {
            console.error('[Checkout] Error loading provinces:', err);
            return [];
          }),
        ]);
        if (!cart || !cart.items || cart.items.length === 0) {
          notify.warning('Giỏ hàng đang trống, vui lòng chọn sản phẩm trước khi thanh toán.');
          navigate('/cart');
          return;
        }

        const state = location.state || {};
        const selectedIds = Array.isArray(state.selectedItemIds) ? state.selectedItemIds : null;
        const items = (cart.items || []).map((item) => ({
          id: item.id,
          name: item.productName,
          quantity: item.quantity,
          finalPrice: item.finalPrice || item.unitPrice * item.quantity,
        }));

        const filteredItems =
          selectedIds && selectedIds.length > 0
            ? items.filter((i) => selectedIds.includes(i.id))
            : items;

        setSelectedItems(filteredItems);

        // Lưu danh sách địa chỉ để hiển thị và chọn
        const list = Array.isArray(myAddresses) ? myAddresses : myAddresses?.result || [];
        setAddresses(list);
        setProvinces(Array.isArray(provs) ? provs : provs?.result || []);

        // Ưu tiên địa chỉ mặc định, nếu không có thì lấy địa chỉ đầu tiên
        if (Array.isArray(list) && list.length > 0) {
          const defaultAddress = list.find((a) => a.defaultAddress) || list[0];
          setShippingAddress(defaultAddress);
        } else {
          setShippingAddress(null);
        }

        setCartSummary({
          subtotal: cart.subtotal || 0,
          voucherDiscount: cart.voucherDiscount || 0,
          totalAmount: cart.totalAmount || 0,
        });
      } catch (error) {
        console.error('[Checkout] Error loading cart:', error);
        notify.error('Không thể tải thông tin giỏ hàng. Vui lòng thử lại.');
        navigate('/cart');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [location.state, navigate]);

  const formatPrice = (price) => {
    const value = Math.round(Number(price) || 0);
    return (
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' ₫'
    );
  };

  const handleConfirm = () => {
    if (!shippingAddress) {
      notify.warning('Bạn cần thêm địa chỉ giao hàng trước khi thanh toán.');
      return;
    }

    // TODO: Gọi API /orders/checkout với paymentMethod, cartItemIds, addressId...
    notify.success(`Bạn đã chọn phương thức thanh toán: ${paymentMethod}. Luồng tạo đơn hàng sẽ được triển khai sau.`);
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className={cx('container')}>
        <div className={cx('loading')}>Đang tải thông tin thanh toán...</div>
      </div>
    );
  }

  return (
    <div className={cx('container')}>
      <div className={cx('cartSection')}>
        {/* 1. Thông tin vận chuyển (địa chỉ) */}
        <h2 className={cx('cartTitle')}>Thông tin vận chuyển</h2>

        <div className={cx('checkoutAddressWrapper')}>
          {shippingAddress ? (
            <div className={cx('checkoutAddress')}>
              <div className={cx('checkoutAddressTitle')}>Địa chỉ nhận hàng</div>
              <div className={cx('checkoutAddressContent')}>
                <div className={cx('checkoutAddressName')}>
                  {shippingAddress.recipientName} • {shippingAddress.recipientPhoneNumber}
                </div>
                <div className={cx('checkoutAddressLine')}>
                  {shippingAddress.address}, {shippingAddress.wardName}, {shippingAddress.districtName},{' '}
                  {shippingAddress.provinceName}
                </div>
              </div>
            </div>
          ) : (
            <div className={cx('checkoutAddress', 'noAddress')}>
              <div className={cx('checkoutAddressTitle')}>Địa chỉ nhận hàng</div>
              <div className={cx('checkoutAddressContent')}>
                Bạn chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ bên dưới trước khi thanh toán.
              </div>
            </div>
          )}

          <div className={cx('addressListHeader')}>
            <span>Các địa chỉ đã lưu</span>
            <button
              type="button"
              className={cx('btn', 'btnAddAddress')}
              onClick={() => setShowAddressForm(true)}
            >
              Thêm địa chỉ mới
            </button>
          </div>

          {addresses.length > 0 && (
            <div className={cx('addressList')}>
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  className={cx('addressItem', {
                    active: shippingAddress && shippingAddress.id === addr.id,
                  })}
                  onClick={() => setShippingAddress(addr)}
                >
                  <div className={cx('addressItemMain')}>
                    <span className={cx('addressItemName')}>{addr.recipientName}</span>
                    <span className={cx('addressItemPhone')}>{addr.recipientPhoneNumber}</span>
                  </div>
                  <div className={cx('addressItemLine')}>
                    {addr.address}, {addr.wardName}, {addr.districtName}, {addr.provinceName}
                  </div>
                  {addr.defaultAddress && <span className={cx('addressItemTag')}>Mặc định</span>}
                </button>
              ))}
            </div>
          )}

          {/* Form thêm địa chỉ sẽ hiển thị dạng popup (modal) phía dưới */}
        </div>

        {/* 2. Phương thức giao hàng (tạm thời 1 lựa chọn cố định) */}
        <div className={cx('checkoutSubSection')}>
          <div className={cx('checkoutSubTitle')}>Phương thức giao hàng</div>
          <div className={cx('shippingMethodCard')}>
            <label className={cx('shippingMethodActive')}>
              <input type="radio" checked readOnly />
              <div>
                <div className={cx('shippingMethodName')}>Giao hàng tiêu chuẩn</div>
                <div className={cx('shippingMethodNote')}>Dự kiến giao trong 2–5 ngày làm việc</div>
              </div>
            </label>
          </div>
        </div>

        {/* 3. Phương thức thanh toán */}
        <div className={cx('checkoutSubSection')}>
          <div className={cx('checkoutSubTitle')}>Phương thức thanh toán</div>
          <div className={cx('paymentMethods')}>
          <label className={cx('paymentMethod', { active: paymentMethod === 'MOMO' })}>
            <input
              type="radio"
              name="paymentMethod"
              value="MOMO"
              checked={paymentMethod === 'MOMO'}
              onChange={() => setPaymentMethod('MOMO')}
            />
            <span>Thanh toán qua MoMo</span>
          </label>

          <label className={cx('paymentMethod', { active: paymentMethod === 'COD' })}>
            <input
              type="radio"
              name="paymentMethod"
              value="COD"
              checked={paymentMethod === 'COD'}
              onChange={() => setPaymentMethod('COD')}
            />
            <span>Thanh toán khi nhận hàng (COD)</span>
          </label>
          </div>
        </div>

        {/* 4. Sản phẩm đã chọn */}
        {selectedItems.length > 0 && (
          <div className={cx('checkoutSubSection')}>
            <div className={cx('checkoutSubTitle')}>Sản phẩm</div>
            <div className={cx('checkoutItems')}>
              <ul className={cx('checkoutItemsList')}>
                {selectedItems.map((item) => (
                  <li key={item.id} className={cx('checkoutItem')}>
                    <span className={cx('checkoutItemName')}>{item.name}</span>
                    <span className={cx('checkoutItemQty')}>x{item.quantity}</span>
                    <span className={cx('checkoutItemPrice')}>{formatPrice(item.finalPrice)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className={cx('summarySection')}>
        <div className={cx('orderSummary')}>
          <div className={cx('summaryRow')}>
            <span>Tạm tính:</span>
            <span>{formatPrice(cartSummary.subtotal)}</span>
          </div>
          {cartSummary.voucherDiscount > 0 && (
            <div className={cx('summaryRow')}>
              <span>Giảm giá:</span>
              <span className={cx('discountAmount')}>-{formatPrice(cartSummary.voucherDiscount)}</span>
            </div>
          )}
          <div className={cx('summaryRow', 'totalRow')}>
            <span>Tổng cộng (đã gồm VAT):</span>
            <span className={cx('totalAmount')}>{formatPrice(cartSummary.totalAmount)}</span>
          </div>

          <button type="button" className={cx('btn', 'btnBuy')} onClick={handleConfirm}>
            XÁC NHẬN THANH TOÁN
          </button>
          <p className={cx('vatNote')}>(Giá hiển thị đã bao gồm VAT)</p>
        </div>

        {showAddressForm && (
          <div className={cx('addressModalOverlay')} onClick={() => setShowAddressForm(false)}>
            <div
              className={cx('addressModal')}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <h3 className={cx('addressModalTitle')}>Thêm địa chỉ mới</h3>
              <form
                className={cx('addressForm')}
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const payload = {
                      ...addressForm,
                      provinceID: null,
                      districtID: null,
                      wardCode: null,
                    };
                    const newAddress = await createAddress(payload);
                    const list = [...addresses, newAddress];
                    setAddresses(list);
                    setShippingAddress(newAddress);
                    setShowAddressForm(false);
                    notify.success('Đã thêm địa chỉ mới.');
                  } catch (error) {
                    console.error('[Checkout] Error creating address:', error);
                    notify.error(error.message || 'Không thể thêm địa chỉ. Vui lòng thử lại.');
                  }
                }}
              >
                <div className={cx('addressFormRow')}>
                  <input
                    type="text"
                    placeholder="Tên người nhận"
                    value={addressForm.recipientName}
                    onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Số điện thoại"
                    value={addressForm.recipientPhoneNumber}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, recipientPhoneNumber: e.target.value })
                    }
                    required
                  />
                </div>
                <div className={cx('addressFormRow')}>
                  <select
                    value={selectedProvinceId}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setSelectedProvinceId(id);
                      setSelectedDistrictId('');
                      setDistricts([]);
                      setWards([]);
                      const selected = provinces.find((p) => String(p.ProvinceID) === id);
                      setAddressForm((prev) => ({
                        ...prev,
                        provinceName: selected ? selected.ProvinceName : '',
                        districtName: '',
                        wardName: '',
                      }));
                      if (id) {
                        const ds = await getDistricts(id);
                        setDistricts(Array.isArray(ds) ? ds : ds?.result || []);
                      }
                    }}
                    required
                  >
                    <option value="">Chọn Tỉnh / Thành phố</option>
                    {provinces.map((p) => (
                      <option key={p.ProvinceID} value={p.ProvinceID}>
                        {p.ProvinceName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedDistrictId}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setSelectedDistrictId(id);
                      setWards([]);
                      const selected = districts.find((d) => String(d.DistrictID) === id);
                      setAddressForm((prev) => ({
                        ...prev,
                        districtName: selected ? selected.DistrictName : '',
                        wardName: '',
                      }));
                      if (id) {
                        const ws = await getWards(id);
                        setWards(Array.isArray(ws) ? ws : ws?.result || []);
                      }
                    }}
                    required
                    disabled={!selectedProvinceId}
                  >
                    <option value="">Chọn Quận / Huyện</option>
                    {districts.map((d) => (
                      <option key={d.DistrictID} value={d.DistrictID}>
                        {d.DistrictName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={addressForm.wardName}
                    onChange={(e) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        wardName: e.target.value,
                      }))
                    }
                    required
                    disabled={!selectedDistrictId}
                  >
                    <option value="">Chọn Phường / Xã</option>
                    {wards.map((w) => (
                      <option key={w.WardCode} value={w.WardName}>
                        {w.WardName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={cx('addressFormRow')}>
                  <input
                    type="text"
                    placeholder="Địa chỉ chi tiết (số nhà, đường...)"
                    value={addressForm.address}
                    onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                    required
                  />
                </div>
                <div className={cx('addressFormActions')}>
                  <label className={cx('addressDefaultToggle')}>
                    <input
                      type="checkbox"
                      checked={addressForm.defaultAddress}
                      onChange={(e) =>
                        setAddressForm({ ...addressForm, defaultAddress: e.target.checked })
                      }
                    />
                    <span>Đặt làm địa chỉ mặc định</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className={cx('btn', 'btnCancelAddress')}
                      onClick={() => setShowAddressForm(false)}
                    >
                      Hủy
                    </button>
                    <button type="submit" className={cx('btn', 'btnApply')}>
                      Lưu địa chỉ
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Checkout;


