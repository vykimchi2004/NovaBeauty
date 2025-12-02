import { useEffect, useMemo, useState } from 'react';
import notify from '~/utils/notification';
import { getBanners, createBanner, updateBanner, deleteBanner } from '~/services/banner';
import { getActiveProducts } from '~/services/product';
import { getActiveCategories } from '~/services/category';
import { uploadProductMedia } from '~/services/media';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import { addStaffNotification, detectDeletionNotifications } from '~/utils/staffNotifications';

const DEFAULT_BANNER_FORM = {
  id: '',
  title: '',
  description: '',
  imageUrl: '',
  startDate: '',
  endDate: '',
  status: true,
  productIds: [],
  categoryId: '',
  brand: '',
  targetType: 'all',
  linkUrl: '',
};

const getDefaultStartDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

export function useStaffBannersState() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [bannerList, setBannerList] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState(DEFAULT_BANNER_FORM);
  const [bannerErrors, setBannerErrors] = useState({});
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState('');
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    refreshBannerList();

    return () => {
      if (bannerImagePreview && bannerImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(bannerImagePreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getActiveProducts();
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await getActiveCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const refreshBannerList = async () => {
    try {
      setBannerLoading(true);
      const data = await getBanners();
      const currentUser = storage.get(STORAGE_KEYS.USER);
      const userId = currentUser?.id;
      
      // Filter banners created by current user
      const myBanners = (data || []).filter(
        (banner) => banner.createdBy === userId
      );

      setBannerList(myBanners);

      if (userId) {
        const notifications = detectDeletionNotifications({
          categoryKey: 'BANNERS',
          userId,
          items: myBanners,
          getItemId: (item) => item?.id,
          getItemName: (item) => item?.title || item?.id,
          buildNotification: ({ id, name }) => ({
            title: 'Banner đã bị xóa',
            message: `Banner "${name || id}" đã bị xóa khỏi hệ thống (có thể do admin hoặc do bạn xóa).`,
            type: 'info',
            targetPath: '/staff/content',
          }),
        });

        notifications.forEach((notification) => {
          addStaffNotification(userId, notification);
        });
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      notify.error('Không thể tải danh sách banner.');
    } finally {
      setBannerLoading(false);
    }
  };

  const matchesFilters = (item) => {
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      const title = item.title?.toLowerCase() || '';
      const description = item.description?.toLowerCase() || '';
      if (!title.includes(term) && !description.includes(term)) return false;
    }
    if (selectedDate) {
      const start = item.startDate ? item.startDate.split('T')[0] : '';
      if (start !== selectedDate) return false;
    }
    // Map banner status to promotion-like status
    const mappedStatus = mapBannerStatusToPromotionStatus(item);
    if (statusFilter !== 'all' && mappedStatus !== statusFilter) return false;
    return true;
  };

  const mapBannerStatusToPromotionStatus = (banner) => {
    if (banner.pendingReview === true) return 'PENDING_APPROVAL';
    if (banner.status === true && banner.pendingReview === false) return 'APPROVED';
    if (banner.status === false && banner.rejectionReason) return 'REJECTED';
    return 'PENDING_APPROVAL';
  };

  const filteredBanners = useMemo(
    () => bannerList.filter(matchesFilters),
    [bannerList, searchTerm, selectedDate, statusFilter],
  );

  const renderStatusBadge = (banner) => {
    const status = mapBannerStatusToPromotionStatus(banner);
    const map = {
      PENDING_APPROVAL: { label: 'Chờ duyệt', className: 'pending' },
      APPROVED: { label: 'Đã duyệt', className: 'approved' },
      REJECTED: { label: 'Không duyệt', className: 'rejected' },
      EXPIRED: { label: 'Hết hạn', className: 'expired' },
      DISABLED: { label: 'Tạm dừng', className: 'expired' },
    };
    const info = map[status] || map.PENDING_APPROVAL;
    return info;
  };

  const openAddBanner = () => {
    setBannerForm({
      ...DEFAULT_BANNER_FORM,
      startDate: getDefaultStartDate(),
      endDate: '',
      productIds: products.map((product) => product.id),
      targetType: 'all',
      linkUrl: '',
    });
    setBannerErrors({});
    setBannerImageFile(null);
    setBannerImagePreview('');
    setShowBannerModal(true);
  };

  const openEditBanner = (banner) => {
    // Không cho phép sửa banner đã được duyệt
    if (banner.status === true && banner.pendingReview === false) {
      notify.warning('Không thể sửa banner đã được duyệt');
      return;
    }
    
    // Kiểm tra và đảm bảo startDate là ngày trong tương lai
    let startDate = banner.startDate ? banner.startDate.split('T')[0] : getDefaultStartDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = new Date(startDate);
    startDateObj.setHours(0, 0, 0, 0);
    
    // Nếu startDate là ngày trong quá khứ hoặc hôm nay, set lại thành ngày mai
    if (startDateObj <= today) {
      startDate = getDefaultStartDate();
    }
    
    const derivedSelection = deriveSelectionFromProductIds(banner.productIds || []);

    setBannerForm({
      id: banner.id,
      title: banner.title || '',
      description: banner.description || '',
      imageUrl: banner.imageUrl || '',
      startDate: startDate,
      endDate: banner.endDate ? banner.endDate.split('T')[0] : '',
      status: banner.status !== false,
      productIds: banner.productIds || [],
      categoryId: derivedSelection.categoryId || '',
      brand: derivedSelection.brand || '',
      targetType: derivedSelection.targetType || '',
      linkUrl: banner.linkUrl || '',
    });
    setBannerErrors({});
    setBannerImageFile(null);
    setBannerImagePreview(banner.imageUrl || '');
    setShowBannerModal(true);
  };

  const closeBannerModal = () => {
    setShowBannerModal(false);
    setBannerErrors({});
    if (bannerImagePreview && bannerImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(bannerImagePreview);
    }
    setBannerImagePreview('');
    setBannerImageFile(null);
    setBannerForm(DEFAULT_BANNER_FORM);
  };

  const handleBannerFormChange = (field, value) => {
    setBannerForm((prev) => ({ ...prev, [field]: value }));
  };

  const getProductCategoryId = (product) => product?.categoryId || product?.category?.id || '';

  const isProductInCategory = (product, targetCategoryId) => {
    if (!targetCategoryId) return false;
    let currentCategoryId = getProductCategoryId(product);
    while (currentCategoryId) {
      if (currentCategoryId === targetCategoryId) return true;
      currentCategoryId = categoryParentMap[currentCategoryId] || null;
    }
    return false;
  };

  const buildProductIdsForSelection = ({ targetType, categoryId, brand }) => {
    if (targetType === 'all') {
      return products.map((product) => product.id);
    }

    if (targetType === 'category') {
      if (!categoryId) return [];
      return products
        .filter((product) => isProductInCategory(product, categoryId))
        .map((product) => product.id);
    }

    if (targetType === 'brand') {
      const normalizedBrand = brand?.trim().toLowerCase();
      if (!normalizedBrand) return [];
      return products
        .filter(
          (product) => (product?.brand?.trim().toLowerCase() || '') === normalizedBrand,
        )
        .map((product) => product.id);
    }

    return [];
  };

  const buildBannerLinkUrl = (form) => {
  const appendHeading = (url) => {
    const heading = (form.title || '').replace(/^banner\s+/i, '').trim();
    if (!heading) return url;
    const [path, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    params.set('heading', heading);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

    const explicitLink = form.linkUrl?.trim();
    if (explicitLink) return appendHeading(explicitLink);

    if (form.targetType === 'all') return appendHeading('/products');

    if (form.targetType === 'category' && form.categoryId) {
      const params = new URLSearchParams({ category: form.categoryId });
      return appendHeading(`/products?${params.toString()}`);
    }

    if (form.targetType === 'brand' && form.brand?.trim()) {
      const params = new URLSearchParams({ brand: form.brand.trim() });
      return appendHeading(`/products?${params.toString()}`);
    }

    if (form.productIds && form.productIds.length > 0) {
      const params = new URLSearchParams({ products: form.productIds.join(',') });
      return appendHeading(`/promo?${params.toString()}`);
    }

    return appendHeading('/products');
  };

  const handleTargetTypeChange = (targetType) => {
    setBannerForm((prev) => {
      if (prev.targetType === targetType) return prev;
      const nextCategoryId = targetType === 'category' ? prev.categoryId : '';
      const nextBrand = targetType === 'brand' ? prev.brand : '';
      return {
        ...prev,
        targetType,
        categoryId: nextCategoryId,
        brand: nextBrand,
        productIds: buildProductIdsForSelection({
          targetType,
          categoryId: nextCategoryId,
          brand: nextBrand,
        }),
      };
    });
  };

  const handleBannerCategorySelect = (categoryId) => {
    setBannerForm((prev) => {
      const next = {
        ...prev,
        categoryId,
      };
      if (prev.targetType === 'category') {
        next.productIds = buildProductIdsForSelection({
          targetType: 'category',
          categoryId,
          brand: prev.brand,
        });
      }
      return next;
    });
  };

  const handleBannerBrandSelect = (brand) => {
    setBannerForm((prev) => {
      const next = {
        ...prev,
        brand,
      };
      if (prev.targetType === 'brand') {
        next.productIds = buildProductIdsForSelection({
          targetType: 'brand',
          categoryId: prev.categoryId,
          brand,
        });
      }
      return next;
    });
  };

  const deriveSelectionFromProductIds = (productIds = []) => {
    if (!productIds.length) return { categoryId: '', brand: '', targetType: '' };
    const matchedProducts = products.filter((product) => productIds.includes(product.id));
    if (!matchedProducts.length) return { categoryId: '', brand: '', targetType: '' };

    const allProductIds = products.map((product) => product.id);
    const isAllSelected =
      allProductIds.length > 0 &&
      allProductIds.every((id) => productIds.includes(id)) &&
      productIds.length === allProductIds.length;
    if (isAllSelected) {
      return { categoryId: '', brand: '', targetType: 'all' };
    }

    const categoryIds = new Set();
    const brandNames = new Set();
    matchedProducts.forEach((product) => {
      const categoryId = getProductCategoryId(product);
      if (categoryId) categoryIds.add(categoryId);
      const brandName = product?.brand?.trim();
      if (brandName) brandNames.add(brandName);
    });

    if (categoryIds.size === 1) {
      return {
        categoryId: categoryIds.values().next().value,
        brand: brandNames.size === 1 ? brandNames.values().next().value : '',
        targetType: 'category',
      };
    }

    if (brandNames.size === 1) {
      return {
        categoryId: '',
        brand: brandNames.values().next().value,
        targetType: 'brand',
      };
    }

    return { categoryId: '', brand: '', targetType: '' };
  };

  const haveSameProductIds = (a = [], b = []) => {
    if (a.length !== b.length) return false;
    const setB = new Set(b);
    return a.every((id) => setB.has(id));
  };

  useEffect(() => {
    if (!showBannerModal) return;
    setBannerForm((prev) => {
      let nextState = prev;
      if (prev.targetType === 'all') {
        const nextIds = buildProductIdsForSelection({ targetType: 'all' });
        if (!haveSameProductIds(nextIds, prev.productIds)) {
          nextState = {
            ...prev,
            productIds: nextIds,
          };
        }
      }

      if (
        prev.id &&
        !prev.categoryId &&
        !prev.brand &&
        !prev.targetType &&
        prev.productIds.length > 0
      ) {
        const derived = deriveSelectionFromProductIds(prev.productIds);
        if (derived.categoryId || derived.brand || derived.targetType) {
          nextState = {
            ...nextState,
            categoryId: nextState.categoryId || derived.categoryId,
            brand: nextState.brand || derived.brand,
            targetType: nextState.targetType || derived.targetType,
          };
        }
      }

      return nextState === prev ? prev : nextState;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, showBannerModal]);

  const handleBannerImageChange = (file) => {
    if (!file) {
      // Remove image
      if (bannerImagePreview && bannerImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(bannerImagePreview);
      }
      setBannerImageFile(null);
      setBannerImagePreview('');
      setBannerForm((prev) => ({ ...prev, imageUrl: '' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify.error('Kích thước file không được vượt quá 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      notify.error('File phải là hình ảnh');
      return;
    }

    setBannerImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setBannerImagePreview(previewUrl);
    setBannerForm((prev) => ({ ...prev, imageUrl: '' }));
  };

  const validateBannerForm = () => {
    const errors = {};
    if (!bannerForm.title?.trim()) errors.title = 'Tiêu đề không được để trống';
    if (!bannerForm.imageUrl?.trim() && !bannerImageFile) {
      errors.imageUrl = 'Vui lòng chọn hoặc upload ảnh banner';
    }
    if (!bannerForm.startDate) {
      errors.startDate = 'Ngày bắt đầu không được để trống';
    } else {
      // Kiểm tra startDate phải là ngày trong tương lai
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateObj = new Date(bannerForm.startDate);
      startDateObj.setHours(0, 0, 0, 0);
      if (startDateObj <= today) {
        errors.startDate = 'Ngày bắt đầu phải là ngày trong tương lai';
      }
    }
    if (!bannerForm.endDate) {
      errors.endDate = 'Ngày kết thúc không được để trống';
    } else if (bannerForm.startDate && bannerForm.startDate >= bannerForm.endDate) {
      errors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    }

    if (!bannerForm.targetType) {
      errors.targetType = 'Vui lòng chọn áp dụng theo danh mục hoặc thương hiệu';
    } else if (bannerForm.targetType === 'category') {
      if (!bannerForm.categoryId) {
        errors.categoryId = 'Vui lòng chọn danh mục áp dụng';
      }
    } else if (bannerForm.targetType === 'brand') {
      if (!bannerForm.brand?.trim()) {
        errors.brand = 'Vui lòng chọn thương hiệu áp dụng';
      }
    }

    if (!bannerForm.productIds || bannerForm.productIds.length === 0) {
      errors.productIds = 'Không tìm thấy sản phẩm nào phù hợp với lựa chọn hiện tại';
    }
    setBannerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitBanner = async (e) => {
    e.preventDefault();
    if (!validateBannerForm()) return;

    try {
      let finalImageUrl = bannerForm.imageUrl;

      // Upload image if new file selected
      if (bannerImageFile) {
        setUploadingBannerImage(true);
        try {
          const uploadResult = await uploadProductMedia([bannerImageFile]);
          if (uploadResult && uploadResult.length > 0) {
            finalImageUrl = uploadResult[0];
          } else {
            throw new Error('Upload ảnh thất bại');
          }
        } catch (uploadErr) {
          console.error('Error uploading image:', uploadErr);
          notify.error('Không thể upload ảnh. Vui lòng thử lại.');
          setUploadingBannerImage(false);
          return;
        } finally {
          setUploadingBannerImage(false);
        }
      }

      const payload = {
        title: bannerForm.title.trim(),
        description: bannerForm.description?.trim() || null,
        imageUrl: finalImageUrl,
        startDate: bannerForm.startDate,
        endDate: bannerForm.endDate,
        status: bannerForm.status,
        productIds: bannerForm.productIds.length > 0 ? bannerForm.productIds : null,
      linkUrl: buildBannerLinkUrl(bannerForm),
      };

      if (bannerForm.id) {
        await updateBanner(bannerForm.id, payload);
        notify.success('Cập nhật banner thành công!');
      } else {
        await createBanner(payload);
        notify.success('Thêm banner thành công!');
      }

      closeBannerModal();
      refreshBannerList();
    } catch (error) {
      console.error('Error submitting banner:', error);
      notify.error(error.message || 'Không thể lưu banner. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (bannerId) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc chắn muốn xóa banner này?',
      'Xác nhận xóa banner',
      'Xóa',
      'Hủy'
    );

    if (!confirmed) return;

    try {
      await deleteBanner(bannerId);
      setBannerList(bannerList.filter((b) => b.id !== bannerId));
      notify.success('Xóa banner thành công!');
      if (detailItem?.id === bannerId) {
        setDetailItem(null);
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
      notify.error('Không thể xóa banner. Vui lòng thử lại.');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDate('');
    setStatusFilter('all');
  };

  const categoryParentMap = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      if (category?.id) {
        map[category.id] = category.parentId || null;
      }
    });
    return map;
  }, [categories]);

  const brandOptions = useMemo(() => {
    const unique = new Map();
    products.forEach((product) => {
      const brand = product?.brand?.trim();
      if (!brand) return;
      const key = brand.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, brand);
      }
    });
    return Array.from(unique.values()).sort((a, b) =>
      a.localeCompare(b, 'vi', { sensitivity: 'base' }),
    );
  }, [products]);

  return {
    searchTerm,
    selectedDate,
    statusFilter,
    setSearchTerm,
    setSelectedDate,
    setStatusFilter,
    clearFilters,
    filteredBanners,
    bannerLoading,
    renderStatusBadge,
    detailItem,
    setDetailItem,
    handleDelete,
    // banner modal
    showBannerModal,
    bannerForm,
    bannerErrors,
    bannerImagePreview,
    uploadingBannerImage,
    openAddBanner,
    openEditBanner,
    closeBannerModal,
    handleBannerFormChange,
    handleTargetTypeChange,
    handleBannerImageChange,
    submitBanner,
    handleBannerCategorySelect,
    handleBannerBrandSelect,
    categories,
    loadingCategories,
    brandOptions,
  };
}

