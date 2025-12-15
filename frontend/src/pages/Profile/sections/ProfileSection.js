import React, { useEffect, useState, useRef, useCallback } from 'react';
import classNames from 'classnames/bind';
import styles from '../Profile.module.scss';
import { 
  getMyAddresses, 
  formatFullAddress, 
  setDefaultAddress, 
  createAddress,
  deleteAddress,
  getProvinces,
  getDistricts,
  getWards
} from '~/services/address';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

function ProfileSection({
  isEditingProfile,
  isSavingProfile,
  profileForm,
  profileMessage,
  phoneError,
  onCancelEdit,
  onChange,
  onSubmit,
  onAddressClick,
  showAddressList,
  onCloseAddressList,
  onSelectAddress,
  addressRefreshKey,
  setAddressRefreshKey,
  selectedAddress,
}) {
  const [addresses, setAddresses] = useState([]);
  const [deletingAddressId, setDeletingAddressId] = useState('');
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state for new address
  const [newAddressForm, setNewAddressForm] = useState({
    recipientName: '',
    recipientPhoneNumber: '',
    detailAddress: '',
    isDefault: false,
  });
  
  // GHN location state
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardCode, setSelectedWardCode] = useState('');
  const [ghnAvailable, setGhnAvailable] = useState(true);
  
  // Dropdown state
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showWardDropdown, setShowWardDropdown] = useState(false);
  
  // Refs for dropdowns
  const provinceDropdownRef = useRef(null);
  const districtDropdownRef = useRef(null);
  const wardDropdownRef = useRef(null);
  
  // Form errors
  const [addressError, setAddressError] = useState('');
  const [newAddressPhoneError, setNewAddressPhoneError] = useState('');

  // Load provinces
  const loadProvinces = useCallback(async () => {
    try {
      const data = await getProvinces();
      setProvinces(Array.isArray(data) ? data : []);
      setGhnAvailable(true);
    } catch (error) {
      console.error('Error loading provinces:', error);
      setGhnAvailable(false);
    }
  }, []);

  // Load districts
  const loadDistricts = useCallback(async (provinceId) => {
    if (!provinceId) {
      setDistricts([]);
      setWards([]);
      return;
    }
    try {
      const data = await getDistricts(provinceId);
      setDistricts(Array.isArray(data) ? data : []);
      setSelectedDistrictId('');
      setSelectedWardCode('');
      setWards([]);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  }, []);

  // Load wards
  const loadWards = useCallback(async (districtId) => {
    if (!districtId) {
      setWards([]);
      return;
    }
    try {
      const data = await getWards(districtId);
      setWards(Array.isArray(data) ? data : []);
      setSelectedWardCode('');
    } catch (error) {
      console.error('Error loading wards:', error);
    }
  }, []);

  useEffect(() => {
    if (showAddressList && !showAddForm) {
      const fetchAddresses = async () => {
        setLoadingAddresses(true);
        try {
          const data = await getMyAddresses();
          const sorted = Array.isArray(data) 
            ? [...data].sort((a, b) => {
                if (a?.defaultAddress && !b?.defaultAddress) return -1;
                if (!a?.defaultAddress && b?.defaultAddress) return 1;
                return 0;
              })
            : [];
          setAddresses(sorted);
        } catch (err) {
          console.error('Không thể tải danh sách địa chỉ', err);
        } finally {
          setLoadingAddresses(false);
        }
      };
      fetchAddresses();
    }
  }, [showAddressList, addressRefreshKey, showAddForm]);

  // Load provinces when showing add form
  useEffect(() => {
    if (showAddForm && provinces.length === 0) {
      loadProvinces();
    }
  }, [showAddForm, provinces.length, loadProvinces]);

  // Load districts when province changes
  useEffect(() => {
    if (selectedProvinceId) {
      loadDistricts(selectedProvinceId);
    }
  }, [selectedProvinceId, loadDistricts]);

  // Load wards when district changes
  useEffect(() => {
    if (selectedDistrictId) {
      loadWards(selectedDistrictId);
    }
  }, [selectedDistrictId, loadWards]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (provinceDropdownRef.current && !provinceDropdownRef.current.contains(event.target)) {
        setShowProvinceDropdown(false);
      }
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(event.target)) {
        setShowDistrictDropdown(false);
      }
      if (wardDropdownRef.current && !wardDropdownRef.current.contains(event.target)) {
        setShowWardDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSetDefault = async (address) => {
    if (address.defaultAddress) return;
    const addressId = address.id || address.addressId || address.address_id;
    if (!addressId) {
      console.error('Address ID not found:', address);
      return;
    }
    try {
      await setDefaultAddress(addressId);
      if (setAddressRefreshKey) {
        setAddressRefreshKey((prev) => prev + 1);
      }
      // Refresh addresses
      const data = await getMyAddresses();
      const sorted = Array.isArray(data) 
        ? [...data].sort((a, b) => {
            if (a?.defaultAddress && !b?.defaultAddress) return -1;
            if (!a?.defaultAddress && b?.defaultAddress) return 1;
            return 0;
          })
        : [];
      setAddresses(sorted);
    } catch (err) {
      console.error('Không thể đặt địa chỉ mặc định', err);
    }
  };

  const handleDeleteAddress = async (address) => {
    const addressId = address.id || address.addressId || address.address_id;
    if (!addressId) {
      console.error('Address ID not found:', address);
      return;
    }
    if (address.defaultAddress) {
      notify.error('Không thể xóa địa chỉ mặc định. Hãy đặt địa chỉ khác làm mặc định trước.');
      return;
    }

    try {
      setDeletingAddressId(addressId);
      await deleteAddress(addressId);
      notify.success('Đã xóa địa chỉ');
      if (setAddressRefreshKey) {
        setAddressRefreshKey((prev) => prev + 1);
      }
      // Refresh addresses
      const data = await getMyAddresses();
      const sorted = Array.isArray(data) 
        ? [...data].sort((a, b) => {
            if (a?.defaultAddress && !b?.defaultAddress) return -1;
            if (!a?.defaultAddress && b?.defaultAddress) return 1;
            return 0;
          })
        : [];
      setAddresses(sorted);
    } catch (err) {
      console.error('Không thể xóa địa chỉ', err);
      notify.error('Không thể xóa địa chỉ. Vui lòng thử lại.');
    } finally {
      setDeletingAddressId('');
    }
  };

  const handleSelectAddress = (address) => {
    if (onSelectAddress) {
      onSelectAddress(address);
    }
    if (onCloseAddressList) {
      onCloseAddressList();
    }
  };

  // Get selected names
  const selectedProvinceName = provinces.find(
    (p) => String(p.ProvinceID || p.id) === String(selectedProvinceId)
  )?.ProvinceName || provinces.find(
    (p) => String(p.ProvinceID || p.id) === String(selectedProvinceId)
  )?.name || '';

  const selectedDistrictName = districts.find(
    (d) => String(d.DistrictID || d.id) === String(selectedDistrictId)
  )?.DistrictName || districts.find(
    (d) => String(d.DistrictID || d.id) === String(selectedDistrictId)
  )?.name || '';

  const selectedWardName = wards.find(
    (w) => String(w.WardCode || w.code) === String(selectedWardCode)
  )?.WardName || wards.find(
    (w) => String(w.WardCode || w.code) === String(selectedWardCode)
  )?.name || '';

  // Handle save new address
  const handleSaveNewAddress = async () => {
    setAddressError('');
    setNewAddressPhoneError('');

    if (!newAddressForm.recipientName.trim()) {
      setAddressError('Vui lòng nhập họ tên người nhận.');
      return;
    }

    const normalizedPhone = newAddressForm.recipientPhoneNumber.trim();
    const phoneRegex = /^0[0-9]{9}$/;
    if (!normalizedPhone) {
      setNewAddressPhoneError('Vui lòng nhập số điện thoại.');
      return;
    }
    if (!phoneRegex.test(normalizedPhone)) {
      setNewAddressPhoneError('Hãy nhập số điện thoại bắt đầu từ 0 và đủ 10 số.');
      return;
    }

    let finalProvinceName = '';
    let finalDistrictName = '';
    let finalWardName = '';

    if (ghnAvailable) {
      if (!newAddressForm.detailAddress.trim() || !selectedProvinceId || !selectedDistrictId || !selectedWardCode) {
        setAddressError('Vui lòng chọn đầy đủ tỉnh / huyện / xã và nhập địa chỉ chi tiết.');
        return;
      }
      finalProvinceName = selectedProvinceName;
      finalDistrictName = selectedDistrictName;
      finalWardName = selectedWardName;
    } else {
      if (!newAddressForm.detailAddress.trim()) {
        setAddressError('Vui lòng nhập đầy đủ địa chỉ giao hàng.');
        return;
      }
    }

    try {
      const addressData = {
        recipientName: newAddressForm.recipientName.trim(),
        recipientPhoneNumber: normalizedPhone,
        provinceID: selectedProvinceId || '',
        provinceName: finalProvinceName,
        districtID: selectedDistrictId || '',
        districtName: finalDistrictName,
        wardCode: selectedWardCode || '',
        wardName: finalWardName,
        address: newAddressForm.detailAddress.trim(),
        defaultAddress: newAddressForm.isDefault,
      };
      const newAddress = await createAddress(addressData);
      
      // Nếu đặt làm mặc định, gọi API set default
      if (newAddressForm.isDefault && newAddress?.id) {
        const addressId = newAddress.id || newAddress.addressId || newAddress.address_id;
        if (addressId) {
          await setDefaultAddress(addressId);
        }
      }

      notify.success('Đã lưu địa chỉ mới!');
      
      // Reset form
      setNewAddressForm({
        recipientName: '',
        recipientPhoneNumber: '',
        detailAddress: '',
        isDefault: false,
      });
      setSelectedProvinceId('');
      setSelectedDistrictId('');
      setSelectedWardCode('');
      setDistricts([]);
      setWards([]);
      setShowAddForm(false);
      
      // Refresh addresses and select new address
      if (setAddressRefreshKey) {
        setAddressRefreshKey((prev) => prev + 1);
      }
      
      // Auto select the new address
      if (onSelectAddress && newAddress) {
        onSelectAddress(newAddress);
      }
    } catch (error) {
      console.error('Error saving address:', error);
      notify.error('Không thể lưu địa chỉ. Vui lòng thử lại.');
    }
  };

  // Reset form when closing
  const handleCloseAddForm = () => {
    setShowAddForm(false);
    setNewAddressForm({
      recipientName: '',
      recipientPhoneNumber: '',
      detailAddress: '',
      isDefault: false,
    });
    setSelectedProvinceId('');
    setSelectedDistrictId('');
    setSelectedWardCode('');
    setDistricts([]);
    setWards([]);
    setAddressError('');
    setNewAddressPhoneError('');
  };
  return (
    <div className={cx('card')}>
      <div className={cx('cardHeader')}>
        <h2>Hồ sơ cá nhân</h2>
        <div className={cx('actions')}>
          {isEditingProfile ? (
            <>
              <button
                type="button"
                className={cx('btn', 'btnSecondary')}
                onClick={onCancelEdit}
                disabled={isSavingProfile}
              >
                Huỷ
              </button>
              <button
                type="submit"
                form="profile-form"
                className={cx('btn', 'btnPrimary')}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={cx('btn', 'btnPrimary')}
              onClick={() => onChange('__toggle_edit__', true)}
            >
              Sửa
            </button>
          )}
        </div>
      </div>

      <form id="profile-form" onSubmit={onSubmit}>
        <div className={cx('grid')}>
          <label>
            Họ và tên
            <input
              className={cx('input')}
              type="text"
              value={profileForm.fullName}
              onChange={(event) => onChange('fullName', event.target.value)}
              placeholder="Chưa cập nhật"
              disabled={!isEditingProfile}
            />
          </label>
          <label>
            Email đăng nhập
            <input
              className={cx('input', 'inputDisabled')}
              type="email"
              value={profileForm.email}
              disabled
            />
          </label>
          <label>
            Số điện thoại
            <input
              className={cx('input')}
              type="tel"
              value={profileForm.phone}
              onChange={(event) => {
                // Chỉ cho phép nhập số
                const value = event.target.value.replace(/[^0-9]/g, '');
                // Giới hạn 10 ký tự
                const limitedValue = value.slice(0, 10);
                onChange('phone', limitedValue);
              }}
              onKeyPress={(e) => {
                // Chỉ cho phép nhập số
                if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                  e.preventDefault();
                }
              }}
              placeholder="Chưa cập nhật (bắt đầu bằng 0, 10 số)"
              disabled={!isEditingProfile}
              maxLength={10}
            />
            {phoneError && (
              <div className={cx('fieldError')}>{phoneError}</div>
            )}
          </label>
          <label>
            Địa chỉ
            <input
              className={cx('input')}
              type="text"
              value={profileForm.address}
              readOnly
              onClick={() => isEditingProfile && onAddressClick && onAddressClick()}
              onFocus={() => isEditingProfile && onAddressClick && onAddressClick()}
              placeholder="Chọn từ danh sách địa chỉ của bạn"
              disabled={!isEditingProfile}
            />
          </label>
        </div>

        {profileMessage && (
          <div className={cx('footerSpace', profileMessage.type)}>{profileMessage.text}</div>
        )}
      </form>

      {/* Address List Modal */}
      {showAddressList && (
        <div className={cx('addressModalOverlay')} onClick={onCloseAddressList}>
          <div className={cx('addressModal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('addressModalHeader')}>
              <h3>Địa chỉ của bạn</h3>
              <button className={cx('addressModalClose')} onClick={onCloseAddressList}>
                ×
              </button>
            </div>
            <div className={cx('addressModalContent')}>
              {showAddForm ? (
                <div className={cx('addressFormContainer')}>
                  <div className={cx('addressFormHeader')}>
                    <h4>Thêm địa chỉ mới</h4>
                  </div>
                  
                  <div className={cx('addressForm')}>
                    <div className={cx('addressFormRow')}>
                      <input
                        type="text"
                        placeholder="Họ và tên người nhận"
                        value={newAddressForm.recipientName}
                        onChange={(e) => setNewAddressForm(prev => ({ ...prev, recipientName: e.target.value }))}
                      />
                      <input
                        type="text"
                        placeholder="Số điện thoại (bắt đầu bằng 0, 10 số)"
                        value={newAddressForm.recipientPhoneNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setNewAddressForm(prev => ({ ...prev, recipientPhoneNumber: value }));
                        }}
                        maxLength={10}
                      />
                    </div>

                    {ghnAvailable ? (
                      <>
                        <div className={cx('addressFormRow')}>
                          <div
                            className={cx('addressDropdown', !selectedProvinceId && 'addressDropdownPlaceholder')}
                            ref={provinceDropdownRef}
                          >
                            <button
                              type="button"
                              className={cx('addressDropdownButton')}
                              onClick={() => setShowProvinceDropdown(!showProvinceDropdown)}
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
                                    onClick={() => {
                                      setSelectedProvinceId(String(p.ProvinceID || p.id));
                                      setShowProvinceDropdown(false);
                                    }}
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
                              (!selectedDistrictId || !districts.length) && 'addressDropdownPlaceholder',
                              !selectedProvinceId && 'addressDropdownDisabled'
                            )}
                            ref={districtDropdownRef}
                          >
                            <button
                              type="button"
                              className={cx('addressDropdownButton')}
                              onClick={() => setShowDistrictDropdown(!showDistrictDropdown)}
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
                                    onClick={() => {
                                      setSelectedDistrictId(String(d.DistrictID || d.id));
                                      setShowDistrictDropdown(false);
                                    }}
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
                              !selectedDistrictId && 'addressDropdownDisabled'
                            )}
                            ref={wardDropdownRef}
                          >
                            <button
                              type="button"
                              className={cx('addressDropdownButton')}
                              onClick={() => setShowWardDropdown(!showWardDropdown)}
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
                                    onClick={() => {
                                      setSelectedWardCode(String(w.WardCode || w.code));
                                      setShowWardDropdown(false);
                                    }}
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
                            value={newAddressForm.detailAddress}
                            onChange={(e) => setNewAddressForm(prev => ({ ...prev, detailAddress: e.target.value }))}
                          />
                        </div>
                      </>
                    ) : (
                      <div className={cx('addressFormRow')}>
                        <input
                          type="text"
                          placeholder="Nhập đầy đủ địa chỉ: Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                          value={newAddressForm.detailAddress}
                          onChange={(e) => setNewAddressForm(prev => ({ ...prev, detailAddress: e.target.value }))}
                        />
                      </div>
                    )}

                    {(addressError || newAddressPhoneError) && (
                      <div className={cx('addressErrors')}>
                        {addressError && <p>{addressError}</p>}
                        {newAddressPhoneError && <p>{newAddressPhoneError}</p>}
                      </div>
                    )}

                    <label className={cx('defaultAddressCheckbox')}>
                      <input
                        type="checkbox"
                        checked={newAddressForm.isDefault}
                        onChange={(e) => setNewAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                      />
                      <span>Đặt làm địa chỉ mặc định</span>
                    </label>

                    <div className={cx('addressFormActions')}>
                      <button
                        className={cx('addressBtn', 'primary')}
                        onClick={handleSaveNewAddress}
                      >
                        Lưu địa chỉ
                      </button>
                    </div>
                  </div>
                </div>
              ) : loadingAddresses ? (
                <div className={cx('addressModalLoading')}>Đang tải danh sách địa chỉ...</div>
              ) : addresses.length === 0 ? (
                <div className={cx('addressModalEmpty')}>
                  Bạn chưa có địa chỉ nào. Vui lòng thêm địa chỉ mới.
                </div>
              ) : (
                <ul className={cx('addressList')}>
                  {addresses.map((address) => {
                    const addressId = address.id || address.addressId || address.address_id;
                    const selectedId = selectedAddress?.id || selectedAddress?.addressId || selectedAddress?.address_id;
                    return (
                    <li
                      key={addressId}
                      className={cx('addressItem', {
                        active: selectedId === addressId,
                        default: address.defaultAddress,
                      })}
                    >
                      <div className={cx('addressItemContent')}>
                        <div className={cx('addressItemHeader')}>
                          <span className={cx('addressRecipient')}>{address.recipientName}</span>
                          <span className={cx('addressDivider')}>•</span>
                          <span className={cx('addressPhone')}>{address.recipientPhoneNumber}</span>
                          {address.defaultAddress && (
                            <span className={cx('addressBadge')}>Mặc định</span>
                          )}
                        <button
                          className={cx('addressBtn', 'danger', 'addressDeleteBtn')}
                          onClick={() => handleDeleteAddress(address)}
                          disabled={address.defaultAddress || deletingAddressId === addressId}
                          title={address.defaultAddress ? 'Đặt địa chỉ khác làm mặc định trước khi xóa' : 'Xóa địa chỉ này'}
                        >
                          Xóa
                        </button>
                        </div>
                        <p className={cx('addressLine')}>{formatFullAddress(address)}</p>
                      </div>
                      <div className={cx('addressItemActions')}>
                        {selectedId === addressId ? (
                          <span className={cx('addressBadge', 'selected')}>Đã chọn</span>
                        ) : (
                          <button
                            className={cx('addressBtn', 'primary')}
                            onClick={() => handleSelectAddress(address)}
                          >
                            Chọn
                          </button>
                        )}
                        {address.defaultAddress ? (
                          <span className={cx('addressBadge')}>Địa chỉ mặc định</span>
                        ) : (
                          <button
                            className={cx('addressBtn', 'secondary')}
                            onClick={() => handleSetDefault(address)}
                          >
                            Đặt làm mặc định
                          </button>
                        )}
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {!showAddForm && (
              <div className={cx('addressModalFooter')}>
                <button className={cx('addressBtn', 'ghost')} onClick={onCloseAddressList}>
                  Đóng
                </button>
                <button 
                  className={cx('addressBtn', 'primary')} 
                  onClick={() => setShowAddForm(true)}
                >
                  + Thêm địa chỉ mới
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileSection;



