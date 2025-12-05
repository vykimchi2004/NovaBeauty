import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  getProvinces,
  getDistricts,
  getWards,
  calculateShippingFee,
  getMyAddresses,
  createAddress,
  setDefaultAddress,
} from '~/services/address';
import notify from '~/utils/notification';

/**
 * Custom hook để quản lý địa chỉ giao hàng và tích hợp GHN
 * @param {Object} options - Options
 * @param {number} options.totalWeight - Tổng trọng lượng đơn hàng (gram)
 * @param {number} options.subtotal - Tổng tiền trước giảm giá
 * @param {number} options.totalAfterDiscount - Tổng tiền sau giảm giá (để tính bảo hiểm)
 * @param {boolean} options.autoLoadAddresses - Tự động load danh sách địa chỉ (default: true)
 * @returns {Object} Address state và methods
 */
export const useAddress = ({
  totalWeight = 500,
  subtotal = 0,
  totalAfterDiscount = 0,
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

  // GHN location data
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardCode, setSelectedWardCode] = useState('');

  // UI state
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showWardDropdown, setShowWardDropdown] = useState(false);
  const [ghnAvailable, setGhnAvailable] = useState(true);

  // Validation errors
  const [addressError, setAddressError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Shipping fee
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingFeeLoading, setShippingFeeLoading] = useState(false);

  // Refs for dropdown click outside
  const provinceDropdownRef = useRef(null);
  const districtDropdownRef = useRef(null);
  const wardDropdownRef = useRef(null);

  // Computed values
  const selectedProvinceName = useMemo(() => {
    if (!selectedProvinceId) return '';
    const pv = provinces.find(
      (p) => String(p.ProvinceID || p.id) === String(selectedProvinceId),
    );
    return pv?.ProvinceName || pv?.name || '';
  }, [provinces, selectedProvinceId]);

  const selectedDistrictName = useMemo(() => {
    if (!selectedDistrictId) return '';
    const dist = districts.find(
      (d) => String(d.DistrictID || d.id) === String(selectedDistrictId),
    );
    return dist?.DistrictName || dist?.name || '';
  }, [districts, selectedDistrictId]);

  const selectedWardName = useMemo(() => {
    if (!selectedWardCode) return '';
    const ward = wards.find(
      (w) => String(w.WardCode || w.code) === String(selectedWardCode),
    );
    return ward?.WardName || ward?.name || '';
  }, [wards, selectedWardCode]);

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

  // Load danh sách tỉnh từ GHN
  const loadProvinces = useCallback(async () => {
    try {
      const data = await getProvinces();
      setProvinces(Array.isArray(data) ? data : []);
      setGhnAvailable(true);
    } catch (error) {
      console.error('[useAddress] Error loading provinces:', error);
      setGhnAvailable(false);
    }
  }, []);

  // Chọn địa chỉ đã lưu
  const selectSavedAddress = useCallback(
    async (addr) => {
      setSelectedAddressId(addr.addressId);
      setFullName(addr.recipientName || '');
      setPhone(addr.recipientPhoneNumber || '');
      setDetailAddress(addr.address || '');
      setSelectedProvinceId(String(addr.provinceID) || '');
      setSelectedDistrictId(String(addr.districtID) || '');
      setSelectedWardCode(String(addr.wardCode) || '');

      const fullAddr = [addr.address, addr.wardName, addr.districtName, addr.provinceName]
        .filter(Boolean)
        .join(', ');
      setAddress(fullAddr);

      // Tính phí vận chuyển cho địa chỉ đã chọn
      if (ghnAvailable && addr.districtID && addr.wardCode) {
        setShippingFeeLoading(true);
        try {
          const feePayload = {
            serviceId: null,
            insuranceValue: Math.round(totalAfterDiscount || subtotal || 0),
            coupon: null,
            fromDistrictId: null,
            fromWardCode: null,
            toDistrictId: Number(addr.districtID),
            toWardCode: Number(addr.wardCode) || addr.wardCode,
            weight: totalWeight > 0 ? totalWeight : 500,
            length: 20,
            width: 15,
            height: 10,
          };
          const feeData = await calculateShippingFee(feePayload);
          const raw =
            feeData?.total_fee ??
            feeData?.total ??
            feeData?.service_fee ??
            feeData?.main_service ??
            25000;
          setShippingFee(Number(raw) || 0);
        } catch (error) {
          console.error('[useAddress] Error calculating shipping fee:', error);
          setShippingFee(25000);
        } finally {
          setShippingFeeLoading(false);
        }
      } else {
        setShippingFee(0);
      }
    },
    [ghnAvailable, totalWeight, subtotal, totalAfterDiscount],
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

      let finalProvinceName = '';
      let finalDistrictName = '';
      let finalWardName = '';
      let fullAddressString = '';

      if (ghnAvailable) {
        if (!detailAddress.trim() || !selectedProvinceId || !selectedDistrictId || !selectedWardCode) {
          setAddressError('Vui lòng chọn đầy đủ tỉnh / huyện / xã và nhập địa chỉ chi tiết.');
          return false;
        }
        const province = provinces.find(
          (p) => String(p.ProvinceID || p.id) === String(selectedProvinceId),
        );
        const district = districts.find(
          (d) => String(d.DistrictID || d.id) === String(selectedDistrictId),
        );
        const ward = wards.find(
          (w) => String(w.WardCode || w.code) === String(selectedWardCode),
        );

        finalProvinceName = province?.ProvinceName || province?.name || '';
        finalDistrictName = district?.DistrictName || district?.name || '';
        finalWardName = ward?.WardName || ward?.name || '';

        fullAddressString = [detailAddress.trim(), finalWardName, finalDistrictName, finalProvinceName]
          .filter(Boolean)
          .join(', ');
      } else {
        if (!detailAddress.trim()) {
          setAddressError('Vui lòng nhập đầy đủ địa chỉ giao hàng.');
          return false;
        }
        fullAddressString = detailAddress.trim();
      }

      try {
        const addressData = {
          recipientName: fullName.trim(),
          recipientPhoneNumber: normalizedPhone,
          provinceID: selectedProvinceId,
          provinceName: finalProvinceName,
          districtID: selectedDistrictId,
          districtName: finalDistrictName,
          wardCode: selectedWardCode,
          wardName: finalWardName,
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
      selectedProvinceId,
      selectedDistrictId,
      selectedWardCode,
      ghnAvailable,
      provinces,
      districts,
      wards,
      loadAddresses,
      selectSavedAddress,
    ],
  );

  // Reset form địa chỉ
  const resetForm = useCallback(() => {
    setFullName('');
    setPhone('');
    setDetailAddress('');
    setSelectedProvinceId('');
    setSelectedDistrictId('');
    setSelectedWardCode('');
    setDistricts([]);
    setWards([]);
    setAddressError('');
    setPhoneError('');
  }, []);

  // Handlers cho dropdown GHN
  const handleSelectProvince = useCallback(
    async (value) => {
      setSelectedProvinceId(value);
      setSelectedDistrictId('');
      setSelectedWardCode('');
      setDistricts([]);
      setWards([]);

      if (!value) return;

      try {
        const data = await getDistricts(value);
        setDistricts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('[useAddress] Error loading districts:', error);
      }
    },
    [],
  );

  const handleSelectDistrict = useCallback(
    async (value) => {
      setSelectedDistrictId(value);
      setSelectedWardCode('');
      setWards([]);

      if (!value) return;

      try {
        const data = await getWards(value);
        setWards(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('[useAddress] Error loading wards:', error);
      }
    },
    [],
  );

  // Toggle dropdowns
  const toggleProvinceDropdown = useCallback(() => {
    if (!provinces.length) return;
    setShowProvinceDropdown((prev) => !prev);
    setShowDistrictDropdown(false);
    setShowWardDropdown(false);
  }, [provinces.length]);

  const toggleDistrictDropdown = useCallback(() => {
    if (!selectedProvinceId || !districts.length) return;
    setShowDistrictDropdown((prev) => !prev);
    setShowProvinceDropdown(false);
    setShowWardDropdown(false);
  }, [selectedProvinceId, districts.length]);

  const toggleWardDropdown = useCallback(() => {
    if (!selectedDistrictId || !wards.length) return;
    setShowWardDropdown((prev) => !prev);
    setShowProvinceDropdown(false);
    setShowDistrictDropdown(false);
  }, [selectedDistrictId, wards.length]);

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

  // Auto load addresses khi mount
  useEffect(() => {
    if (autoLoadAddresses) {
      loadAddresses();
    }
  }, [autoLoadAddresses, loadAddresses]);

  // Tính lại shipping fee khi địa chỉ thay đổi
  useEffect(() => {
    if (ghnAvailable && selectedDistrictId && selectedWardCode && detailAddress.trim()) {
      setShippingFeeLoading(true);
      const feePayload = {
        serviceId: null,
        insuranceValue: Math.round(totalAfterDiscount || subtotal || 0),
        coupon: null,
        fromDistrictId: null,
        fromWardCode: null,
        toDistrictId: Number(selectedDistrictId),
        toWardCode: Number(selectedWardCode) || selectedWardCode,
        weight: totalWeight > 0 ? totalWeight : 500,
        length: 20,
        width: 15,
        height: 10,
      };

      calculateShippingFee(feePayload)
        .then((feeData) => {
          const raw =
            feeData?.total_fee ??
            feeData?.total ??
            feeData?.service_fee ??
            feeData?.main_service ??
            25000;
          setShippingFee(Number(raw) || 0);
        })
        .catch((error) => {
          console.error('[useAddress] Error calculating shipping fee:', error);
          setShippingFee(25000);
        })
        .finally(() => {
          setShippingFeeLoading(false);
        });
    }
  }, [selectedDistrictId, selectedWardCode, detailAddress, ghnAvailable, totalWeight, subtotal, totalAfterDiscount]);

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

    // GHN location data
    provinces,
    setProvinces,
    districts,
    setDistricts,
    wards,
    setWards,
    selectedProvinceId,
    setSelectedProvinceId,
    selectedDistrictId,
    setSelectedDistrictId,
    selectedWardCode,
    setSelectedWardCode,

    // Computed names
    selectedProvinceName,
    selectedDistrictName,
    selectedWardName,

    // UI state
    showProvinceDropdown,
    setShowProvinceDropdown,
    showDistrictDropdown,
    setShowDistrictDropdown,
    showWardDropdown,
    setShowWardDropdown,
    ghnAvailable,
    setGhnAvailable,

    // Validation errors
    addressError,
    setAddressError,
    phoneError,
    setPhoneError,

    // Shipping fee
    shippingFee,
    setShippingFee,
    shippingFeeLoading,

    // Refs
    provinceDropdownRef,
    districtDropdownRef,
    wardDropdownRef,

    // Methods
    loadAddresses,
    loadProvinces,
    selectSavedAddress,
    saveAddress,
    resetForm,
    handleSelectProvince,
    handleSelectDistrict,
    setSelectedWardCode,
    toggleProvinceDropdown,
    toggleDistrictDropdown,
    toggleWardDropdown,
  };
};

