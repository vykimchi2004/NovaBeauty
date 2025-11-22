import { useEffect, useMemo, useState } from 'react';
import notify from '~/utils/notification';
import {
  getMyPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '~/services/promotion';
import { getCategories } from '~/services/category';
import { getActiveProducts } from '~/services/product';
import { uploadProductMedia } from '~/services/media';

const DEFAULT_VOUCHER_FORM = {
  id: '',
  name: '',
  code: '',
  imageUrl: '',
  description: '',
  discountValue: '',
  maxDiscountValue: '',
  minOrderValue: '',
  startDate: '',
  expiryDate: '',
  usageLimit: '',
  discountValueType: 'PERCENTAGE',
  applyScope: 'ORDER', // ORDER = toàn sản phẩm hoặc theo tổng giá trị đơn hàng
  orderValueType: 'ALL', // 'ALL' = toàn sản phẩm, 'MIN_ORDER' = theo tổng giá trị đơn hàng
  categoryIds: [],
  productIds: [],
};

const DEFAULT_PROMOTION_FORM = {
  id: '',
  name: '',
  code: '',
  imageUrl: '',
  description: '',
  discountValue: '',
  maxDiscountValue: '',
  minOrderValue: '',
  startDate: '',
  expiryDate: '',
  usageLimit: '',
  applyScope: 'CATEGORY',
  categoryIds: [],
  productIds: [],
  discountValueType: 'PERCENTAGE',
};

const getDefaultStartDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

export function useStaffVouchersState() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [voucherList, setVoucherList] = useState([]);
  const [promotionList, setPromotionList] = useState([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [promotionLoading, setPromotionLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherForm, setVoucherForm] = useState(DEFAULT_VOUCHER_FORM);
  const [voucherErrors, setVoucherErrors] = useState({});
  const [voucherImageFile, setVoucherImageFile] = useState(null);
  const [voucherImagePreview, setVoucherImagePreview] = useState('');
  const [uploadingVoucherImage, setUploadingVoucherImage] = useState(false);

  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionForm, setPromotionForm] = useState(DEFAULT_PROMOTION_FORM);
  const [promotionErrors, setPromotionErrors] = useState({});
  const [promotionImageFile, setPromotionImageFile] = useState(null);
  const [promotionImagePreview, setPromotionImagePreview] = useState('');
  const [uploadingPromotionImage, setUploadingPromotionImage] = useState(false);

  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    fetchCatalogs();
    refreshVoucherList();
    refreshPromotionList();

    return () => {
      if (voucherImagePreview && voucherImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(voucherImagePreview);
      }
      if (promotionImagePreview && promotionImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(promotionImagePreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCatalogs = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([getCategories(), getActiveProducts()]);
      setCategories((catRes || []).filter((cat) => cat.status !== false));
      setProducts(prodRes || []);
    } catch (error) {
      console.error('Error fetching catalogs', error);
    }
  };

  const refreshVoucherList = async () => {
    try {
      setVoucherLoading(true);
      const data = await getMyPromotions();
      setVoucherList((data || []).filter((item) => item.applyScope === 'ORDER'));
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      notify.error('Không thể tải danh sách voucher.');
    } finally {
      setVoucherLoading(false);
    }
  };

  const refreshPromotionList = async () => {
    try {
      setPromotionLoading(true);
      const data = await getMyPromotions();
      setPromotionList((data || []).filter((item) => item.applyScope !== 'ORDER'));
    } catch (error) {
      console.error('Error fetching promotions:', error);
      notify.error('Không thể tải danh sách khuyến mãi.');
    } finally {
      setPromotionLoading(false);
    }
  };

  const matchesFilters = (item) => {
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const name = item.name?.toLowerCase() || '';
      const code = item.code?.toLowerCase() || '';
      if (!name.includes(term) && !code.includes(term)) return false;
    }
    if (selectedDate) {
      const start = item.startDate ? item.startDate.split('T')[0] : '';
      if (start !== selectedDate) return false;
    }
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  };

  const filteredVouchers = useMemo(
    () => voucherList.filter(matchesFilters),
    [voucherList, searchTerm, selectedDate, statusFilter],
  );

  const filteredPromotions = useMemo(
    () => promotionList.filter(matchesFilters),
    [promotionList, searchTerm, selectedDate, statusFilter],
  );

  const combinedEntries = useMemo(() => {
    const vouchers = filteredVouchers.map((item) => ({ ...item, __type: 'voucher' }));
    const promotions = filteredPromotions.map((item) => ({ ...item, __type: 'promotion' }));
    return [...vouchers, ...promotions].sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
      return bDate - aDate;
    });
  }, [filteredVouchers, filteredPromotions]);

  const renderStatusBadge = (status) => {
    const mapped = status || 'PENDING_APPROVAL';
    const map = {
      PENDING_APPROVAL: { label: 'Chờ duyệt', className: 'pending' },
      APPROVED: { label: 'Đã duyệt', className: 'approved' },
      REJECTED: { label: 'Không duyệt', className: 'rejected' },
      EXPIRED: { label: 'Hết hạn', className: 'expired' },
      DISABLED: { label: 'Tạm dừng', className: 'expired' },
    };
    const info = map[mapped] || map.PENDING_APPROVAL;
    return info;
  };

  const openAddVoucher = () => {
    setVoucherForm({
      ...DEFAULT_VOUCHER_FORM,
      code: '',
      startDate: getDefaultStartDate(),
      expiryDate: '',
      usageLimit: '',
      applyScope: 'ORDER',
      orderValueType: 'ALL',
      categoryIds: [],
      productIds: [],
    });
    setVoucherErrors({});
    setVoucherImageFile(null);
    setVoucherImagePreview('');
    setShowVoucherModal(true);
  };

  const openEditVoucher = (voucher) => {
    // Không cho phép sửa voucher đã được duyệt
    if (voucher.status === 'APPROVED') {
      notify.warning('Không thể sửa voucher đã được duyệt');
      return;
    }
    
    setVoucherForm({
      id: voucher.id,
      name: voucher.name || '',
      code: voucher.code || '',
      imageUrl: voucher.imageUrl || '',
      description: voucher.description || '',
      discountValue: voucher.discountValue?.toString() || '',
      maxDiscountValue: voucher.maxDiscountValue?.toString() || '',
      minOrderValue: voucher.minOrderValue?.toString() || '',
      startDate: voucher.startDate || '',
      expiryDate: voucher.expiryDate || '',
      usageLimit: voucher.usageLimit?.toString() || '',
      discountValueType: voucher.discountValueType || 'PERCENTAGE',
      applyScope: voucher.applyScope || 'ORDER',
      orderValueType: voucher.minOrderValue ? 'MIN_ORDER' : 'ALL',
      categoryIds: voucher.categoryIds || [],
      productIds: voucher.productIds || [],
    });
    setVoucherErrors({});
    setVoucherImageFile(null);
    setVoucherImagePreview(voucher.imageUrl || '');
    setShowVoucherModal(true);
  };

  const openAddPromotion = () => {
    setPromotionForm({
      ...DEFAULT_PROMOTION_FORM,
      code: '',
      startDate: getDefaultStartDate(),
      expiryDate: '',
      usageLimit: '',
      applyScope: 'CATEGORY',
      discountValueType: 'PERCENTAGE',
    });
    setPromotionErrors({});
    setPromotionImageFile(null);
    setPromotionImagePreview('');
    setShowPromotionModal(true);
  };

  const openEditPromotion = (promotion) => {
    // Không cho phép sửa khuyến mãi đã được duyệt
    if (promotion.status === 'APPROVED') {
      notify.warning('Không thể sửa khuyến mãi đã được duyệt');
      return;
    }
    
    setPromotionForm({
      id: promotion.id,
      name: promotion.name || '',
      code: promotion.code || '',
      imageUrl: promotion.imageUrl || '',
      description: promotion.description || '',
      discountValue: promotion.discountValue?.toString() || '',
      maxDiscountValue: promotion.maxDiscountValue?.toString() || '',
      minOrderValue: promotion.minOrderValue?.toString() || '',
      startDate: promotion.startDate || '',
      expiryDate: promotion.expiryDate || '',
      usageLimit: promotion.usageLimit?.toString() || '',
      applyScope: promotion.applyScope || 'CATEGORY',
      categoryIds: promotion.categoryIds || [],
      productIds: promotion.productIds || [],
      discountValueType: promotion.discountValueType || 'PERCENTAGE',
    });
    setPromotionErrors({});
    setPromotionImageFile(null);
    setPromotionImagePreview(promotion.imageUrl || '');
    setShowPromotionModal(true);
  };

  const closeVoucherModal = () => {
    setShowVoucherModal(false);
    setVoucherErrors({});
    if (voucherImagePreview && voucherImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(voucherImagePreview);
    }
    setVoucherImagePreview('');
    setVoucherImageFile(null);
  };

  const closePromotionModal = () => {
    setShowPromotionModal(false);
    setPromotionErrors({});
    if (promotionImagePreview && promotionImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(promotionImagePreview);
    }
    setPromotionImagePreview('');
    setPromotionImageFile(null);
  };

  const handleVoucherFormChange = (field, value) => {
    setVoucherForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVoucherScopeChange = (scope, orderValueType = null) => {
    setVoucherForm((prev) => ({
      ...prev,
      applyScope: scope,
      orderValueType: orderValueType !== null ? orderValueType : (scope === 'ORDER' ? 'ALL' : prev.orderValueType),
      categoryIds: scope === 'CATEGORY' ? prev.categoryIds : [],
      productIds: scope === 'PRODUCT' ? prev.productIds : [],
    }));
  };

  const toggleVoucherCategory = (categoryId) => {
    setVoucherForm((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      return {
        ...prev,
        categoryIds: exists
          ? prev.categoryIds.filter((id) => id !== categoryId)
          : [...prev.categoryIds, categoryId],
      };
    });
  };

  const toggleVoucherProduct = (productId) => {
    setVoucherForm((prev) => {
      const exists = prev.productIds.includes(productId);
      return {
        ...prev,
        productIds: exists
          ? prev.productIds.filter((id) => id !== productId)
          : [...prev.productIds, productId],
      };
    });
  };

  const handlePromotionFormChange = (field, value) => {
    setPromotionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePromotionScopeChange = (scope) => {
    setPromotionForm((prev) => ({
      ...prev,
      applyScope: scope,
      productIds: scope === 'PRODUCT' ? prev.productIds : [],
    }));
  };

  const togglePromotionCategory = (categoryId) => {
    setPromotionForm((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      return {
        ...prev,
        categoryIds: exists
          ? prev.categoryIds.filter((id) => id !== categoryId)
          : [...prev.categoryIds, categoryId],
      };
    });
  };

  const togglePromotionProduct = (productId) => {
    setPromotionForm((prev) => {
      const exists = prev.productIds.includes(productId);
      return {
        ...prev,
        productIds: exists
          ? prev.productIds.filter((id) => id !== productId)
          : [...prev.productIds, productId],
      };
    });
  };

  const handleVoucherImageChange = (file) => {
    if (!file) {
      if (voucherImagePreview && voucherImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(voucherImagePreview);
      }
      setVoucherImageFile(null);
      setVoucherImagePreview('');
      setVoucherForm((prev) => ({ ...prev, imageUrl: '' }));
      return;
    }
    if (voucherImagePreview && voucherImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(voucherImagePreview);
    }
    setVoucherImageFile(file);
    setVoucherImagePreview(URL.createObjectURL(file));
  };

  const handlePromotionImageChange = (file) => {
    if (!file) {
      if (promotionImagePreview && promotionImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(promotionImagePreview);
      }
      setPromotionImageFile(null);
      setPromotionImagePreview('');
      setPromotionForm((prev) => ({ ...prev, imageUrl: '' }));
      return;
    }
    if (promotionImagePreview && promotionImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(promotionImagePreview);
    }
    setPromotionImageFile(file);
    setPromotionImagePreview(URL.createObjectURL(file));
  };

  const validateVoucherForm = () => {
    const errors = {};
    if (!voucherForm.name?.trim()) errors.name = 'Tên voucher không được để trống';
    if (!voucherForm.code?.trim()) errors.code = 'Mã voucher không được để trống';
    if (!voucherForm.discountValue || Number(voucherForm.discountValue) <= 0) {
      errors.discountValue = 'Giá trị giảm không hợp lệ';
    }
    if (!voucherForm.startDate) errors.startDate = 'Chọn ngày bắt đầu';
    if (!voucherForm.expiryDate) errors.expiryDate = 'Chọn ngày kết thúc';
    if (!voucherForm.usageLimit || Number(voucherForm.usageLimit) <= 0) {
      errors.usageLimit = 'Giới hạn sử dụng phải lớn hơn 0';
    }
    if (!voucherForm.imageUrl && !voucherImageFile) {
      errors.imageUrl = 'Vui lòng chọn hình voucher';
    }
    // Validate scope-specific fields
    if (voucherForm.applyScope === 'ORDER' && voucherForm.orderValueType === 'MIN_ORDER' && (!voucherForm.minOrderValue || Number(voucherForm.minOrderValue) <= 0)) {
      errors.minOrderValue = 'Đơn hàng tối thiểu phải lớn hơn 0';
    }
    if (voucherForm.applyScope === 'CATEGORY' && (!voucherForm.categoryIds || voucherForm.categoryIds.length === 0)) {
      errors.categoryIds = 'Vui lòng chọn ít nhất một danh mục';
    }
    if (voucherForm.applyScope === 'PRODUCT' && (!voucherForm.productIds || voucherForm.productIds.length === 0)) {
      errors.productIds = 'Vui lòng chọn ít nhất một sản phẩm';
    }
    setVoucherErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePromotionForm = () => {
    const errors = {};
    if (!promotionForm.name?.trim()) errors.name = 'Tên khuyến mãi không được để trống';
    if (!promotionForm.code?.trim()) errors.code = 'Mã khuyến mãi không được để trống';
    if (!promotionForm.discountValue || Number(promotionForm.discountValue) <= 0) {
      errors.discountValue = 'Giá trị giảm không hợp lệ';
    }
    if (!promotionForm.startDate) errors.startDate = 'Chọn ngày bắt đầu';
    if (!promotionForm.expiryDate) errors.expiryDate = 'Chọn ngày kết thúc';
    if (!promotionForm.usageLimit || Number(promotionForm.usageLimit) <= 0) {
      errors.usageLimit = 'Giới hạn sử dụng phải lớn hơn 0';
    }
    if (!promotionForm.imageUrl && !promotionImageFile) {
      errors.imageUrl = 'Vui lòng chọn hình khuyến mãi';
    }
    setPromotionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitVoucher = async (event) => {
    event.preventDefault();
    if (!validateVoucherForm()) return;

    let imageUrl = voucherForm.imageUrl || '';
    if (voucherImageFile) {
      try {
        setUploadingVoucherImage(true);
        const uploaded = await uploadProductMedia([voucherImageFile]);
        imageUrl = uploaded?.[0] || '';
      } catch (error) {
        notify.error('Không thể tải hình voucher, vui lòng thử lại.');
        setUploadingVoucherImage(false);
        return;
      } finally {
        setUploadingVoucherImage(false);
      }
    }

    const payload = {
      name: voucherForm.name.trim(),
      code: voucherForm.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
      imageUrl: imageUrl || null,
      description: voucherForm.description?.trim() || null,
      discountValue: Number(voucherForm.discountValue),
      maxDiscountValue: voucherForm.maxDiscountValue ? Number(voucherForm.maxDiscountValue) : null,
      minOrderValue: voucherForm.minOrderValue ? Number(voucherForm.minOrderValue) : null,
      startDate: voucherForm.startDate,
      expiryDate: voucherForm.expiryDate,
      usageLimit: voucherForm.usageLimit ? Number(voucherForm.usageLimit) : null,
      discountValueType: voucherForm.discountValueType || 'PERCENTAGE',
      applyScope: voucherForm.applyScope || 'ORDER',
      categoryIds: voucherForm.applyScope === 'CATEGORY' && voucherForm.categoryIds.length
        ? voucherForm.categoryIds
        : null,
      productIds: voucherForm.applyScope === 'PRODUCT' && voucherForm.productIds.length
        ? voucherForm.productIds
        : null,
    };

    try {
      if (voucherForm.id) {
        await updatePromotion(voucherForm.id, payload);
        notify.success('Cập nhật voucher thành công.');
      } else {
        await createPromotion(payload);
        notify.success('Thêm voucher thành công.');
      }
      closeVoucherModal();
      refreshVoucherList();
    } catch (error) {
      console.error('Error saving voucher:', error);
      notify.error('Không thể lưu voucher, vui lòng thử lại.');
    }
  };

  const submitPromotion = async (event) => {
    event.preventDefault();
    if (!validatePromotionForm()) return;

    let promotionImageUrl = promotionForm.imageUrl || '';
    if (promotionImageFile) {
      try {
        setUploadingPromotionImage(true);
        const uploaded = await uploadProductMedia([promotionImageFile]);
        promotionImageUrl = uploaded?.[0] || '';
      } catch (error) {
        notify.error('Không thể tải hình khuyến mãi, vui lòng thử lại.');
        setUploadingPromotionImage(false);
        return;
      } finally {
        setUploadingPromotionImage(false);
      }
    }

    const payload = {
      name: promotionForm.name.trim(),
      code: promotionForm.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
      imageUrl: promotionImageUrl || null,
      description: promotionForm.description?.trim() || null,
      discountValue: Number(promotionForm.discountValue),
      maxDiscountValue: promotionForm.maxDiscountValue ? Number(promotionForm.maxDiscountValue) : null,
      minOrderValue: promotionForm.minOrderValue ? Number(promotionForm.minOrderValue) : null,
      startDate: promotionForm.startDate,
      expiryDate: promotionForm.expiryDate,
      usageLimit: promotionForm.usageLimit ? Number(promotionForm.usageLimit) : null,
      discountValueType: promotionForm.discountValueType || 'PERCENTAGE',
      applyScope: promotionForm.applyScope,
      categoryIds: promotionForm.applyScope === 'CATEGORY' && promotionForm.categoryIds.length
        ? promotionForm.categoryIds
        : null,
      productIds:
        promotionForm.applyScope === 'PRODUCT' && promotionForm.productIds.length
          ? promotionForm.productIds
          : null,
    };

    try {
      if (promotionForm.id) {
        await updatePromotion(promotionForm.id, payload);
        notify.success('Cập nhật khuyến mãi thành công.');
      } else {
        await createPromotion(payload);
        notify.success('Thêm khuyến mãi thành công.');
      }
      closePromotionModal();
      refreshPromotionList();
    } catch (error) {
      console.error('Error saving promotion:', error);
      notify.error('Không thể lưu khuyến mãi, vui lòng thử lại.');
    }
  };

  const handleDelete = async (item, isVoucher) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc chắn muốn xóa?',
      'Xác nhận xóa',
      'Xóa',
      'Hủy',
    );
    if (!confirmed) return;
    try {
      await deletePromotion(item.id);
      notify.success('Xóa thành công!');
      if (isVoucher) refreshVoucherList();
      else refreshPromotionList();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      notify.error('Không thể xóa, vui lòng thử lại.');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDate('');
    setStatusFilter('all');
  };

  return {
    // filters
    searchTerm,
    selectedDate,
    statusFilter,
    setSearchTerm,
    setSelectedDate,
    setStatusFilter,
    clearFilters,
    // lists
    combinedEntries,
    voucherLoading,
    promotionLoading,
    renderStatusBadge,
    // detail
    detailItem,
    setDetailItem,
    handleDelete,
    // voucher modal
    showVoucherModal,
    voucherForm,
    voucherErrors,
    voucherImagePreview,
    uploadingVoucherImage,
    openAddVoucher,
    openEditVoucher,
    closeVoucherModal,
    handleVoucherFormChange,
    handleVoucherImageChange,
    handleVoucherScopeChange,
    toggleVoucherCategory,
    toggleVoucherProduct,
    submitVoucher,
    // promotion modal
    showPromotionModal,
    promotionForm,
    promotionErrors,
    promotionImagePreview,
    uploadingPromotionImage,
    openAddPromotion,
    openEditPromotion,
    closePromotionModal,
    handlePromotionFormChange,
    handlePromotionScopeChange,
    togglePromotionCategory,
    togglePromotionProduct,
    handlePromotionImageChange,
    submitPromotion,
    // data for forms
    categories,
    products,
  };
}

