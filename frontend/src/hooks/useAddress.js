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
import {
  GHN_DEFAULT_FROM_WARD_CODE,
  GHN_DEFAULT_FROM_DISTRICT_ID,
  GHN_SERVICE_TYPE_LIGHT,
  GHN_SERVICE_TYPE_HEAVY,
  GHN_HEAVY_SERVICE_WEIGHT_THRESHOLD,
} from '~/services/config';
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
  
  // Manual input fields when GHN is not available
  const [manualProvinceName, setManualProvinceName] = useState('');
  const [manualDistrictName, setManualDistrictName] = useState('');
  const [manualWardName, setManualWardName] = useState('');

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

  // Load danh sách tỉnh từ GHN - BẮT BUỘC phải thành công
  const loadProvinces = useCallback(async () => {
    try {
      const data = await getProvinces();
      setProvinces(Array.isArray(data) ? data : []);
      setGhnAvailable(true);
    } catch (error) {
      console.error('[useAddress] Error loading provinces:', error);
      // Log chi tiết lỗi để debug
      if (error.isNetworkError) {
        console.error('[useAddress] Network error - Backend có thể chưa chạy hoặc không kết nối được');
        notify.error('Không thể kết nối đến backend. Vui lòng kiểm tra backend đã chạy chưa.');
      } else if (error.status === 500) {
        console.error('[useAddress] Server error - Có thể GHN service chưa được cấu hình đúng');
        notify.error('Lỗi cấu hình GHN. Vui lòng kiểm tra GHN_TOKEN và GHN_SHOP_ID trong application.yaml');
      } else {
        console.error('[useAddress] API error:', error.status, error.message);
        notify.error('Không thể kết nối đến dịch vụ GHN. Vui lòng kiểm tra cấu hình.');
      }
      setGhnAvailable(false);
    }
  }, []);

  // Chọn địa chỉ đã lưu
  const selectSavedAddress = useCallback(
    async (addr) => {
      console.log('[useAddress] Selecting saved address:', {
        addressId: addr.addressId || addr.id,
        districtID: addr.districtID,
        wardCode: addr.wardCode,
        districtIDType: typeof addr.districtID,
      });
      
      setSelectedAddressId(addr.addressId || addr.id);
      setFullName(addr.recipientName || '');
      setPhone(addr.recipientPhoneNumber || '');
      setDetailAddress(addr.address || '');
      setSelectedProvinceId(String(addr.provinceID || addr.provinceId || '') || '');
      setSelectedDistrictId(String(addr.districtID || addr.districtId || '') || '');
      setSelectedWardCode(String(addr.wardCode || '') || '');

      const fullAddr = [addr.address, addr.wardName, addr.districtName, addr.provinceName]
        .filter(Boolean)
        .join(', ');
      setAddress(fullAddr);

      // Tính phí vận chuyển cho địa chỉ đã chọn
      if (ghnAvailable && addr.districtID && addr.wardCode) {
        setShippingFeeLoading(true);
        try {
          console.log('[useAddress] Address data:', {
            districtID: addr.districtID,
            wardCode: addr.wardCode,
            districtIDType: typeof addr.districtID,
          });
          
          // Validate và parse districtID
          const toDistrictId = parseInt(String(addr.districtID).trim(), 10);
          if (isNaN(toDistrictId) || toDistrictId <= 0) {
            console.warn('[useAddress] Invalid districtID:', addr.districtID, 'parsed as:', toDistrictId);
            setShippingFee(0);
            setShippingFeeLoading(false);
            return;
          }

          const weightGrams = totalWeight > 0 ? totalWeight : 500;
          // Xác định loại dịch vụ dựa trên trọng lượng
          const serviceTypeId =
            weightGrams >= GHN_HEAVY_SERVICE_WEIGHT_THRESHOLD
              ? GHN_SERVICE_TYPE_HEAVY
              : GHN_SERVICE_TYPE_LIGHT;
          
          const feePayload = {
            service_type_id: serviceTypeId,
            insurance_value: Math.round(totalAfterDiscount || subtotal || 0),
            coupon: null,
            from_district_id: GHN_DEFAULT_FROM_DISTRICT_ID,
            from_ward_code: GHN_DEFAULT_FROM_WARD_CODE,
            to_district_id: toDistrictId,
            to_ward_code: String(addr.wardCode) || addr.wardCode,
            weight: weightGrams,
            length: 20,
            width: 15,
            height: 10,
          };
          console.log('[useAddress] Fee payload:', JSON.stringify(feePayload, null, 2));
          const feeData = await calculateShippingFee(feePayload);
          console.log('[useAddress] Shipping fee response:', feeData);
          // Backend trả về GhnFeeResponse với field 'total'
          const totalFee = feeData?.total;
          if (totalFee !== undefined && totalFee !== null) {
            const fee = Number(totalFee) || 0;
            console.log('[useAddress] Calculated shipping fee:', fee);
            setShippingFee(fee);
          } else {
            console.warn('[useAddress] Shipping fee response missing total field:', feeData);
            setShippingFee(0);
          }
        } catch (error) {
          console.error('[useAddress] Error calculating shipping fee:', error);
          setShippingFee(0);
        } finally {
          setShippingFeeLoading(false);
        }
      } else {
        setShippingFee(0);
      }
    },
    [ghnAvailable, totalWeight, subtotal, totalAfterDiscount, GHN_DEFAULT_FROM_DISTRICT_ID, GHN_DEFAULT_FROM_WARD_CODE, GHN_SERVICE_TYPE_LIGHT, GHN_SERVICE_TYPE_HEAVY, GHN_HEAVY_SERVICE_WEIGHT_THRESHOLD],
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
        // Bắt buộc phải dùng GHN - không cho phép nhập thủ công
        setAddressError('Hệ thống yêu cầu GHN để chọn địa chỉ. Vui lòng kiểm tra cấu hình GHN hoặc liên hệ quản trị viên.');
        return false;
      }

      try {
        // Đảm bảo districtID là số hợp lệ trước khi lưu
        const districtIdToSave = ghnAvailable && selectedDistrictId 
          ? String(selectedDistrictId).trim() 
          : '';
        const parsedDistrictId = parseInt(districtIdToSave, 10);
        if (ghnAvailable && (isNaN(parsedDistrictId) || parsedDistrictId <= 0)) {
          setAddressError('Địa chỉ quận/huyện không hợp lệ. Vui lòng chọn lại.');
          return false;
        }

        const addressData = {
          recipientName: fullName.trim(),
          recipientPhoneNumber: normalizedPhone,
          provinceID: ghnAvailable ? selectedProvinceId : '', // Khi GHN không available, để rỗng
          provinceName: finalProvinceName,
          districtID: districtIdToSave, // Đảm bảo là string hợp lệ
          districtName: finalDistrictName,
          wardCode: ghnAvailable ? selectedWardCode : '', // Khi GHN không available, để rỗng
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
      manualProvinceName,
      manualDistrictName,
      manualWardName,
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
    setManualProvinceName('');
    setManualDistrictName('');
    setManualWardName('');
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
      
      console.log('[useAddress] Calculating fee for:', {
        selectedDistrictId,
        selectedWardCode,
        districtIDType: typeof selectedDistrictId,
      });
      
      // Validate và parse districtID
      const toDistrictId = parseInt(String(selectedDistrictId).trim(), 10);
      if (isNaN(toDistrictId) || toDistrictId <= 0) {
        console.warn('[useAddress] Invalid districtID:', selectedDistrictId, 'parsed as:', toDistrictId);
        setShippingFee(0);
        setShippingFeeLoading(false);
        return;
      }
      
      const weightGrams = totalWeight > 0 ? totalWeight : 500;
      // Xác định loại dịch vụ dựa trên trọng lượng
      const serviceTypeId =
        weightGrams >= GHN_HEAVY_SERVICE_WEIGHT_THRESHOLD
          ? GHN_SERVICE_TYPE_HEAVY
          : GHN_SERVICE_TYPE_LIGHT;
      
      const feePayload = {
        service_type_id: serviceTypeId,
        insurance_value: Math.round(totalAfterDiscount || subtotal || 0),
        coupon: null,
        from_district_id: GHN_DEFAULT_FROM_DISTRICT_ID,
        from_ward_code: GHN_DEFAULT_FROM_WARD_CODE,
        to_district_id: toDistrictId,
        to_ward_code: String(selectedWardCode), // WardCode phải là string
        weight: weightGrams,
        length: 20,
        width: 15,
        height: 10,
      };
      console.log('[useAddress] Fee payload:', JSON.stringify(feePayload, null, 2));

      calculateShippingFee(feePayload)
        .then((feeData) => {
          console.log('[useAddress] Shipping fee response:', feeData);
          // Backend trả về GhnFeeResponse với field 'total'
          const totalFee = feeData?.total;
          if (totalFee !== undefined && totalFee !== null) {
            const fee = Number(totalFee) || 0;
            console.log('[useAddress] Calculated shipping fee:', fee);
            setShippingFee(fee);
          } else {
            console.warn('[useAddress] Shipping fee response missing total field:', feeData);
            setShippingFee(0);
          }
        })
        .catch((error) => {
          console.error('[useAddress] Error calculating shipping fee:', error);
          setShippingFee(0);
        })
        .finally(() => {
          setShippingFeeLoading(false);
        });
    }
  }, [selectedDistrictId, selectedWardCode, detailAddress, ghnAvailable, totalWeight, subtotal, totalAfterDiscount, GHN_DEFAULT_FROM_DISTRICT_ID, GHN_DEFAULT_FROM_WARD_CODE, GHN_SERVICE_TYPE_LIGHT, GHN_SERVICE_TYPE_HEAVY, GHN_HEAVY_SERVICE_WEIGHT_THRESHOLD]);

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

    // Manual input fields (when GHN not available)
    manualProvinceName,
    setManualProvinceName,
    manualDistrictName,
    setManualDistrictName,
    manualWardName,
    setManualWardName,

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

