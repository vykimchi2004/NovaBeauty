import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMyAddresses,
  createAddress,
  setDefaultAddress,
} from '~/services/address';
import notify from '~/utils/notification';

/**
 * Custom hook để quản lý địa chỉ giao hàng (Đã loại bỏ GHN)
 * @param {Object} options - Options
 * @param {boolean} options.autoLoadAddresses - Tự động load danh sách địa chỉ (default: true)
 * @returns {Object} Address state và methods
 */
export const useAddress = ({
  autoLoadAddresses = true,
} = {}) => {
  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(''); // Full formatted address string
  const [detailAddress, setDetailAddress] = useState(''); // Street, house number

  // Manual input fields
  const [manualProvinceName, setManualProvinceName] = useState('');
  const [manualDistrictName, setManualDistrictName] = useState('');
  const [manualWardName, setManualWardName] = useState('');

  // Validation errors
  const [addressError, setAddressError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Shipping fee (Constant 0)
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingFeeLoading, setShippingFeeLoading] = useState(false);

  // Computed names (Just return manual inputs)
  const selectedProvinceName = manualProvinceName;
  const selectedDistrictName = manualDistrictName;
  const selectedWardName = manualWardName;

  // Load danh sách địa chỉ đã lưu
  const loadAddresses = useCallback(async () => {
    try {
      const data = await getMyAddresses();
      const addresses = Array.isArray(data) ? data : [];
      setSavedAddresses(addresses);
      return addresses;
    } catch (error) {
      console.error('[useAddress] Error loading addresses:', error);
      notify.error('Không thể tải danh sách địa chỉ.');
      return [];
    }
  }, []);

  // Removed loadProvinces (GHN)

  // Chọn địa chỉ đã lưu
  const selectSavedAddress = useCallback(
    async (addr) => {
      setSelectedAddressId(addr.addressId || addr.id);
      setFullName(addr.recipientName || '');
      setPhone(addr.recipientPhoneNumber || '');
      setDetailAddress(addr.address || ''); // Assuming 'address' field in DB holds street address

      // Map stored names to manual fields
      setManualProvinceName(addr.provinceName || '');
      setManualDistrictName(addr.districtName || '');
      setManualWardName(addr.wardName || '');

      const fullAddr = [addr.address, addr.wardName, addr.districtName, addr.provinceName]
        .filter(Boolean)
        .join(', ');
      setAddress(fullAddr);

      // Shipping fee always 0
      setShippingFee(0);
    },
    [],
  );

  // Lưu địa chỉ mới
  const saveAddress = useCallback(
    async (isDefault = false) => {
      setAddressError('');
      setPhoneError('');

      if (!fullName.trim()) {
        setAddressError('Vui lòng nhập họ tên người nhận.');
        return false;
      }

      const normalizedPhone = phone.trim();
      const phoneRegex = /^0[0-9]{9}$/;
      if (!normalizedPhone) {
        setPhoneError('Vui lòng nhập số điện thoại.');
        return false;
      }
      if (!phoneRegex.test(normalizedPhone)) {
        setPhoneError('Hãy nhập số điện thoại bắt đầu từ 0 và đủ 10 số.');
        return false;
      }

      // Validate Text Fields
      if (!detailAddress.trim() || !manualProvinceName.trim() || !manualDistrictName.trim() || !manualWardName.trim()) {
        setAddressError('Vui lòng nhập đầy đủ địa chỉ.');
        return false;
      }

      try {
        const addressData = {
          recipientName: fullName.trim(),
          recipientPhoneNumber: normalizedPhone,
          provinceID: '',
          provinceName: manualProvinceName.trim(),
          districtID: '',
          districtName: manualDistrictName.trim(),
          wardCode: '',
          wardName: manualWardName.trim(),
          address: detailAddress.trim(),
          defaultAddress: isDefault,
        };
        const newAddress = await createAddress(addressData);

        // Nếu đặt làm mặc định, gọi API set default
        if (isDefault && newAddress?.addressId) {
          await setDefaultAddress(newAddress.addressId);
        }

        notify.success('Đã lưu địa chỉ mới!');
        await loadAddresses(); // Tải lại danh sách địa chỉ
        await selectSavedAddress(newAddress); // Chọn địa chỉ vừa lưu
        return true;
      } catch (error) {
        console.error('[useAddress] Error saving address:', error);
        notify.error('Không thể lưu địa chỉ. Vui lòng thử lại.');
        return false;
      }
    },
    [
      fullName,
      phone,
      detailAddress,
      manualProvinceName,
      manualDistrictName,
      manualWardName,
      loadAddresses,
      selectSavedAddress,
    ],
  );

  // Reset form địa chỉ
  const resetForm = useCallback(() => {
    setFullName('');
    setPhone('');
    setDetailAddress('');
    setManualProvinceName('');
    setManualDistrictName('');
    setManualWardName('');
    setAddressError('');
    setPhoneError('');
  }, []);

  // Removed handleSelectProvince, handleSelectDistrict (GHN Dropdowns)

  // Auto load addresses khi mount
  useEffect(() => {
    if (autoLoadAddresses) {
      loadAddresses();
    }
  }, [autoLoadAddresses, loadAddresses]);

  return {
    // Saved addresses
    savedAddresses,
    setSavedAddresses,
    selectedAddressId,
    setSelectedAddressId,

    // Form fields
    fullName,
    setFullName,
    phone,
    setPhone,
    address,
    setAddress,
    detailAddress,
    setDetailAddress,

    // Manual input fields
    manualProvinceName,
    setManualProvinceName,
    manualDistrictName,
    setManualDistrictName,
    manualWardName,
    setManualWardName,

    // Computed names (Alias to manual inputs for compatibility)
    selectedProvinceName,
    selectedDistrictName,
    selectedWardName,

    // Empty lists for compatibility if needed, or remove them
    provinces: [],
    districts: [],
    wards: [],

    // Validation errors
    addressError,
    setAddressError,
    phoneError,
    setPhoneError,

    // Shipping fee
    shippingFee,
    setShippingFee,
    shippingFeeLoading,

    // Methods
    loadAddresses,
    loadProvinces: async () => { }, // No-op
    selectSavedAddress,
    saveAddress,
    resetForm,
    handleSelectProvince: () => { }, // No-op
    handleSelectDistrict: () => { }, // No-op
    setSelectedWardCode: () => { }, // No-op
    toggleProvinceDropdown: () => { },
    toggleDistrictDropdown: () => { },
    toggleWardDropdown: () => { },

    // Flags
    ghnAvailable: false // Always false or true depending on what UI expects. 
    // AddressListModal previously showed "GHN unavailable" if false.
    // I should update AddressListModal to not check this flag or to treat false as manual input mode.
    // Actually, I'll update AddressListModal to use manual inputs unconditionally.
  };
};

