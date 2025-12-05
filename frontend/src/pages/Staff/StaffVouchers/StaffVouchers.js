import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './StaffVouchers.module.scss';
import { useNavigate } from 'react-router-dom';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import VoucherFormModal from './components/Voucher/VoucherFormModal';
import PromotionFormModal from './components/Promotion/PromotionFormModal';
import DetailModal from './components/DetailModal/DetailModal';
import notify from '~/utils/notification';
import {
  getMyPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '~/services/promotion';
import {
  getMyVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from '~/services/voucher';
import { uploadProductMedia } from '~/services/media';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import { addStaffNotification, detectStatusNotifications, detectDeletionNotifications } from '~/utils/staffNotifications';
import { useCategories, useProducts } from '~/hooks';

const cx = classNames.bind(styles);

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
  applyScope: 'ORDER',
  orderValueType: 'ALL',
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

function StaffVouchers() {
  const navigate = useNavigate();
  
  // Get current user to check role
  const currentUser = storage.get(STORAGE_KEYS.USER);
  const userRole = currentUser?.role?.name?.toUpperCase() || '';
  const isAdmin = userRole === 'ADMIN';
  const userId = currentUser?.id;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [voucherList, setVoucherList] = useState([]);
  const [promotionList, setPromotionList] = useState([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [promotionLoading, setPromotionLoading] = useState(false);

  // Use hooks
  const { categories: allCategories } = useCategories({
    type: 'all',
    autoLoad: true,
    filterInactive: true,
  });
  const { products: allProducts } = useProducts({
    categoryId: null,
    autoLoad: true,
  });

  // Filter categories to only active ones (hook already filters, but ensure)
  const categories = useMemo(() => 
    (allCategories || []).filter((cat) => cat.status !== false),
    [allCategories]
  );
  const products = allProducts || [];

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

  const refreshVoucherList = async () => {
    try {
      setVoucherLoading(true);
      const data = await getMyVouchers();
      const list = data || [];
      setVoucherList(list);
      handleVoucherNotifications(list, 'voucher');
      handleDeletedVoucherNotifications(list, 'voucher');
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      notify.error('Không thể tải danh sách voucher.');
      setVoucherList([]);
    } finally {
      setVoucherLoading(false);
    }
  };

  const refreshPromotionList = async () => {
    try {
      setPromotionLoading(true);
      const data = await getMyPromotions();
      const filtered = (data || []).filter((item) => item.applyScope !== 'ORDER');
      setPromotionList(filtered);
      handleVoucherNotifications(filtered, 'promotion');
      handleDeletedVoucherNotifications(filtered, 'promotion');
    } catch (error) {
      console.error('Error fetching promotions:', error);
      notify.error('Không thể tải danh sách khuyến mãi.');
    } finally {
      setPromotionLoading(false);
    }
  };

  const handleVoucherNotifications = (entries = [], type = 'voucher') => {
    if (!userId || !Array.isArray(entries)) return;
    const notifications = detectStatusNotifications({
      categoryKey: type === 'voucher' ? 'VOUCHERS' : 'PROMOTIONS',
      userId,
      items: entries,
      getItemId: (item) => item?.id,
      getStatus: (item) => item?.status,
      buildNotification: (item, status) => {
        if (status === 'APPROVED') {
          return {
            title: type === 'voucher' ? 'Voucher được duyệt' : 'Khuyến mãi được duyệt',
            message: `${type === 'voucher' ? 'Voucher' : 'Khuyến mãi'} "${item.name || item.code}" đã được admin phê duyệt.`,
            type: 'success',
            targetPath: '/staff/vouchers',
          };
        }
        if (status === 'REJECTED') {
          const reason = item.rejectionReason ? ` Lý do: ${item.rejectionReason}` : '';
          return {
            title: type === 'voucher' ? 'Voucher bị từ chối' : 'Khuyến mãi bị từ chối',
            message: `${type === 'voucher' ? 'Voucher' : 'Khuyến mãi'} "${item.name || item.code}" bị từ chối.${reason}`,
            type: 'warning',
            targetPath: '/staff/vouchers',
          };
        }
        return null;
      },
    });

    notifications.forEach((notification) => {
      addStaffNotification(userId, notification);
      if (notification.type === 'success') {
        notify.success(notification.message);
      } else {
        notify.warning(notification.message);
      }
    });
  };

  const handleDeletedVoucherNotifications = (entries = [], type = 'voucher') => {
    if (!userId || !Array.isArray(entries)) return;

    const notifications = detectDeletionNotifications({
      categoryKey: type === 'voucher' ? 'VOUCHERS' : 'PROMOTIONS',
      userId,
      items: entries,
      getItemId: (item) => item?.id,
      getItemName: (item) => item?.name || item?.code || item?.id,
      buildNotification: ({ id, name }) => ({
        title: type === 'voucher' ? 'Voucher đã bị xóa' : 'Khuyến mãi đã bị xóa',
        message: `${type === 'voucher' ? 'Voucher' : 'Khuyến mãi'} "${name || id}" đã bị xóa khỏi hệ thống (có thể do admin hoặc do bạn xóa).`,
        type: 'info',
        targetPath: '/staff/vouchers',
      }),
    });

    notifications.forEach((notification) => {
      addStaffNotification(userId, notification);
    });
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
      applyScope: 'CATEGORY',
      discountValueType: 'PERCENTAGE',
    });
    setPromotionErrors({});
    setPromotionImageFile(null);
    setPromotionImagePreview('');
    setShowPromotionModal(true);
  };

  const openEditPromotion = (promotion) => {
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
    const discountValue = Number(voucherForm.discountValue);
    if (!voucherForm.discountValue || Number.isNaN(discountValue) || discountValue <= 0) {
      errors.discountValue = 'Giá trị giảm không hợp lệ';
    } else if (voucherForm.discountValueType === 'PERCENTAGE') {
      if (discountValue > 100 || discountValue <= 0) {
        errors.discountValue = 'Phần trăm giảm phải nằm trong khoảng 0 - 100';
      }
      if (!voucherForm.maxDiscountValue || Number(voucherForm.maxDiscountValue) <= 0) {
        errors.maxDiscountValue = 'Vui lòng nhập mức giảm tối đa khi dùng %';
      }
    }
    if (!voucherForm.startDate) errors.startDate = 'Chọn ngày bắt đầu';
    if (!voucherForm.expiryDate) errors.expiryDate = 'Chọn ngày kết thúc';
    if (!voucherForm.usageLimit || Number(voucherForm.usageLimit) <= 0) {
      errors.usageLimit = 'Giới hạn sử dụng phải lớn hơn 0';
    }
    if (!voucherForm.imageUrl && !voucherImageFile) {
      errors.imageUrl = 'Vui lòng chọn hình voucher';
    }
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
        await updateVoucher(voucherForm.id, payload);
        notify.success('Cập nhật voucher thành công.');
      } else {
        await createVoucher(payload);
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
      if (isVoucher) {
        await deleteVoucher(item.id);
      } else {
        await deletePromotion(item.id);
      }
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

  const resolveItemType = (entry = {}) => {
    const normalizedType =
      entry.itemType?.toLowerCase() ||
      entry.__type?.toLowerCase() ||
      entry.sourceType?.toLowerCase() ||
      (typeof entry.type === 'string' ? entry.type.toLowerCase() : '');

    if (normalizedType === 'voucher' || normalizedType === 'promotion') {
      return normalizedType;
    }

    if (typeof entry.isVoucher === 'boolean') {
      return entry.isVoucher ? 'voucher' : 'promotion';
    }

    return entry.applyScope === 'ORDER' ? 'voucher' : 'promotion';
  };

  const getScopeLabel = (entry = {}) => {
    const itemType = resolveItemType(entry);
    const scope = entry.applyScope || 'ORDER';
    const baseLabel = itemType === 'voucher' ? 'Voucher' : 'Khuyến mãi';

    switch (scope) {
      case 'PRODUCT':
        return `${baseLabel} sản phẩm`;
      case 'CATEGORY':
        return `${baseLabel} danh mục`;
      case 'ORDER':
      default:
        return `${baseLabel} toàn đơn`;
    }
  };

  return (
    <div className={cx('wrapper')}>
      <div className={cx('pageHeader')}>
        <h1 className={cx('pageTitle')}>Voucher & Khuyến mãi</h1>
        <button 
          type="button" 
          className={cx('dashboardBtn')} 
          onClick={() => navigate('/staff')}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Dashboard
        </button>
        
      </div>

      <section className={cx('filterBar')}>
        <div className={cx('filterRow')}>
          <input
            type="text"
            className={cx('searchInput')}
            placeholder="Tìm kiếm theo tên, mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="date"
            className={cx('dateInput')}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <select
            className={cx('selectInput')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="PENDING_APPROVAL">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Không duyệt</option>
            <option value="EXPIRED">Hết hạn</option>
          </select>
        </div>
        <div className={cx('filterActions')}>
          <button type="button" className={cx('primaryBtn')} onClick={openAddVoucher}>
            Thêm voucher
          </button>
          <button type="button" className={cx('secondaryBtn')} onClick={openAddPromotion}>
            Thêm khuyến mãi
          </button>
        </div>
      </section>

      <div className={cx('tableCard')}>
        <div className={cx('tableHeader')}>
          <h3 className={cx('tableTitle')}>Danh sách Voucher / Khuyến mãi</h3>
        </div>
        <div className={cx('tableWrap')}>
          <table className={cx('table')}>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Loại</th>
                <th>Giảm giá</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {voucherLoading || promotionLoading ? (
                <tr>
                  <td colSpan={8} className={cx('emptyState')}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : combinedEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className={cx('emptyState')}>
                    Không có dữ liệu phù hợp
                  </td>
                </tr>
              ) : (
                combinedEntries.map((item) => {
                  const itemType = resolveItemType(item);
                  const typedItem = { ...item, itemType };
                  const isVoucher = itemType === 'voucher';
                  const scopeLabel = getScopeLabel(typedItem);
                  return (
                    <tr key={item.id}>
                      <td className={cx('codeCell')}>{item.code}</td>
                      <td>
                        <div>{item.name}</div>
                        <p className={cx('desc')}>{item.description || '-'}</p>
                      </td>
                      <td>{scopeLabel}</td>
                      <td>
                        {item.discountValue}
                        {item.discountValueType === 'AMOUNT' ? ' ₫' : '%'}
                      </td>
                      <td>{item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : '-'}</td>
                      <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('vi-VN') : '-'}</td>
                      <td>
                        {(() => {
                          const info = renderStatusBadge(item.status);
                          return (
                            <span className={cx('statusBadge', info.className)}>
                              {info.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <div className={cx('actions')}>
                          <button
                            type="button"
                            className={cx('actionBtn', 'primary')}
                            onClick={() => setDetailItem(typedItem)}
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            className={cx('actionBtn', 'neutral')}
                            onClick={() => (isVoucher ? openEditVoucher(item) : openEditPromotion(item))}
                            disabled={item.status === 'APPROVED'}
                            title={item.status === 'APPROVED' ? 'Không thể sửa voucher/khuyến mãi đã được duyệt' : ''}
                          >
                            Sửa
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className={cx('actionBtn', 'danger')}
                              onClick={() => handleDelete(item, isVoucher)}
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VoucherFormModal
        open={showVoucherModal}
        mode={voucherForm.id ? 'edit' : 'add'}
        formData={voucherForm}
        formErrors={voucherErrors}
        categories={categories}
        products={products}
        previewUrl={voucherImagePreview}
        uploadingImage={uploadingVoucherImage}
        onClose={closeVoucherModal}
        onChange={handleVoucherFormChange}
        onSubmit={submitVoucher}
        onScopeChange={handleVoucherScopeChange}
        onToggleCategory={toggleVoucherCategory}
        onToggleProduct={toggleVoucherProduct}
        onFileChange={handleVoucherImageChange}
      />

      <PromotionFormModal
        open={showPromotionModal}
        mode={promotionForm.id ? 'edit' : 'add'}
        formData={promotionForm}
        formErrors={promotionErrors}
        categories={categories}
        products={products}
        previewUrl={promotionImagePreview}
        uploadingImage={uploadingPromotionImage}
        onClose={closePromotionModal}
        onChange={handlePromotionFormChange}
        onSubmit={submitPromotion}
        onScopeChange={handlePromotionScopeChange}
        onToggleCategory={togglePromotionCategory}
        onToggleProduct={togglePromotionProduct}
        onFileChange={handlePromotionImageChange}
      />

      <DetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        formatScope={getScopeLabel}
        resolveItemType={resolveItemType}
      />
    </div>
  );
}

export default StaffVouchers;
 
