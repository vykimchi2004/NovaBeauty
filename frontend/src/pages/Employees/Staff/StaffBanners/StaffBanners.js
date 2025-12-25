import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './StaffBanners.module.scss';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus, faEdit, faTrash, faEye } from '@fortawesome/free-solid-svg-icons';
import BannerFormModal from './components/BannerFormModal';
import MagazineFormModal from './components/MagazineFormModal';
import notify from '~/utils/notification';
import { getBanners, createBanner, updateBanner, deleteBanner } from '~/services/banner';
import { uploadProductMedia } from '~/services/media';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import { addStaffNotification, detectDeletionNotifications } from '~/utils/staffNotifications';
import { useProducts, useCategories } from '~/hooks';

const cx = classNames.bind(styles);

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
  isMagazine: false,
};

const getDefaultStartDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

function StaffBanners() {
  const navigate = useNavigate();

  // Get current user to check role and token
  const currentUser = storage.get(STORAGE_KEYS.USER);
  const userRole = currentUser?.role?.name?.toUpperCase() || '';
  const hasDeletePermission = userRole === 'ADMIN' || userRole === 'STAFF';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const [bannerList, setBannerList] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(false);

  // Use hooks
  const { products } = useProducts({
    categoryId: null,
    autoLoad: true,
  });
  const { categories, loading: loadingCategories } = useCategories({
    type: 'active',
    autoLoad: true,
    filterInactive: true,
  });

  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState(DEFAULT_BANNER_FORM);
  const [bannerErrors, setBannerErrors] = useState({});
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState('');
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

  const [showMagazineModal, setShowMagazineModal] = useState(false);
  const [magazineForm, setMagazineForm] = useState({ id: '', title: '', description: '', imageUrl: '' });
  const [magazineErrors, setMagazineErrors] = useState({});
  const [magazineImageFile, setMagazineImageFile] = useState(null);
  const [magazineImagePreview, setMagazineImagePreview] = useState('');
  const [uploadingMagazineImage, setUploadingMagazineImage] = useState(false);

  const [activeTab, setActiveTab] = useState('banners');
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    refreshBannerList();

    return () => {
      if (bannerImagePreview && bannerImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(bannerImagePreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const matchesFilters = useCallback((item) => {
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
    return true;
  }, [searchTerm, selectedDate]);

  const filteredBanners = useMemo(
    () => bannerList.filter(matchesFilters),
    [bannerList, matchesFilters],
  );

  const openAddBanner = () => {
    setBannerForm({
      ...DEFAULT_BANNER_FORM,
      startDate: getDefaultStartDate(),
      endDate: '',
      productIds: products.map((product) => product.id),
      targetType: 'all',
      linkUrl: '',
      isMagazine: false,
    });
    setBannerErrors({});
    setBannerImageFile(null);
    setBannerImagePreview('');
    setShowBannerModal(true);
  };

  const openAddMagazine = () => {
    setMagazineForm({ id: '', title: '', description: '', imageUrl: '', category: '' });
    setMagazineErrors({});
    setMagazineImageFile(null);
    setMagazineImagePreview('');
    setShowMagazineModal(true);
  };

  const closeMagazineModal = () => {
    setShowMagazineModal(false);
    setMagazineErrors({});
    if (magazineImagePreview && magazineImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(magazineImagePreview);
    }
    setMagazineImagePreview('');
    setMagazineImageFile(null);
    setMagazineForm({ id: '', title: '', description: '', imageUrl: '', category: '' });
  };

  const handleMagazineChange = (field, value) => {
    setMagazineForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMagazineFileChange = (file) => {
    if (!file) {
      if (magazineImagePreview && magazineImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(magazineImagePreview);
      }
      setMagazineImageFile(null);
      setMagazineImagePreview('');
      setMagazineForm((prev) => ({ ...prev, imageUrl: '' }));
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

    setMagazineImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setMagazineImagePreview(previewUrl);
    setMagazineForm((prev) => ({ ...prev, imageUrl: '' }));
  };

  const validateMagazineForm = () => {
    const errors = {};
    if (!magazineForm.title?.trim()) errors.title = 'Tiêu đề không được để trống';
    if (!magazineForm.category) errors.category = 'Vui lòng chọn danh mục';
    if (!magazineForm.imageUrl?.trim() && !magazineImageFile) {
      errors.imageUrl = 'Vui lòng chọn hoặc upload ảnh tạp chí';
    }
    setMagazineErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitMagazine = async (e) => {
    e.preventDefault();
    if (!validateMagazineForm()) return;

    try {
      let finalImageUrl = magazineForm.imageUrl;

      if (magazineImageFile) {
        setUploadingMagazineImage(true);
        try {
          const uploadResult = await uploadProductMedia([magazineImageFile]);
          if (uploadResult && uploadResult.length > 0) {
            finalImageUrl = uploadResult[0];
          } else {
            throw new Error('Upload ảnh thất bại');
          }
        } catch (uploadErr) {
          console.error('Error uploading magazine image:', uploadErr);
          notify.error('Không thể upload ảnh. Vui lòng thử lại.');
          setUploadingMagazineImage(false);
          return;
        } finally {
          setUploadingMagazineImage(false);
        }
      }

      // Use banner API with isMagazine flag set
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const end = new Date();
      end.setFullYear(end.getFullYear() + 1);
      const endDate = end.toISOString().split('T')[0];

      const payload = {
        title: magazineForm.title.trim(),
        description: magazineForm.description?.trim() || null,
        imageUrl: finalImageUrl,
        category: magazineForm.category,
        startDate,
        endDate,
        status: true,
        productIds: null,
        linkUrl: null,
        isMagazine: true,
      };

      if (magazineForm.id) {
        await updateBanner(magazineForm.id, payload);
        notify.success('Cập nhật tạp chí thành công!');
      } else {
        await createBanner(payload);
        notify.success('Thêm tạp chí thành công!');
      }
      closeMagazineModal();
      refreshBannerList();
    } catch (error) {
      console.error('Error submitting magazine:', error);
      notify.error(error.message || 'Không thể lưu tạp chí. Vui lòng thử lại.');
    }
  };

  const openEditMagazine = (banner) => {
    setMagazineForm({
      id: banner.id,
      title: banner.title || '',
      description: banner.description || '',
      imageUrl: banner.imageUrl || '',
      category: banner.category || '',
    });
    setMagazineErrors({});
    setMagazineImageFile(null);
    setMagazineImagePreview(banner.imageUrl || '');
    setShowMagazineModal(true);
  };

  const openEditBanner = (banner) => {
    // Staff và Admin đều có thể sửa banner, không cần kiểm tra trạng thái duyệt

    const startDate = banner.startDate ? banner.startDate.split('T')[0] : getDefaultStartDate();
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
      isMagazine: banner.isMagazine === true,
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

  const categoryParentMap = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      if (category?.id) {
        map[category.id] = category.parentId || null;
      }
    });
    return map;
  }, [categories]);

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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDateObj = new Date(bannerForm.startDate);
      startDateObj.setHours(0, 0, 0, 0);
      if (startDateObj < today) {
        errors.startDate = 'Ngày bắt đầu phải từ hôm nay trở đi';
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
        status: true,
        productIds: bannerForm.productIds.length > 0 ? bannerForm.productIds : null,
        linkUrl: buildBannerLinkUrl(bannerForm),
        isMagazine: bannerForm.isMagazine === true,
      };

      if (bannerForm.id) {
        await updateBanner(bannerForm.id, payload);
        notify.success('Cập nhật banner thành công!');
      } else {
        await createBanner(payload);
        notify.success('Thêm banner thành công! Banner đã được tự động kích hoạt.');
      }

      closeBannerModal();
      refreshBannerList();
    } catch (error) {
      console.error('Error submitting banner:', error);
      notify.error(error.message || 'Không thể lưu banner. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (bannerId) => {
    // Kiểm tra quyền trước khi xóa
    if (!hasDeletePermission) {
      notify.error('Bạn không có quyền xóa banner. Vui lòng liên hệ admin.');
      return;
    }

    // Kiểm tra token
    const token = storage.get(STORAGE_KEYS.TOKEN);
    if (!token) {
      notify.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

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

      // Xử lý lỗi chi tiết hơn
      let errorMessage = 'Không thể xóa banner. Vui lòng thử lại.';

      if (error.status === 403 || error.message?.includes('permission') || error.message?.includes('quyền') || error.message?.includes('You do not have permission')) {
        errorMessage = 'Bạn không có quyền xóa banner này. Vui lòng kiểm tra lại quyền truy cập của tài khoản hoặc liên hệ admin.';
      } else if (error.status === 401) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      notify.error(errorMessage);
    }
  };

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

  const stripHtml = (html) => {
    return html?.replace(/<[^>]*>?/gm, '') || '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className={cx('wrapper')}>
      <div className={cx('pageHeader')}>
        <h1 className={cx('pageTitle')}>Quản lý nội dung</h1>
        <button
          type="button"
          className={cx('dashboardBtn')}
          onClick={() => navigate('/staff')}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Dashboard
        </button>
      </div>

      <div className={cx('tabs-container')}>
        <button
          className={cx('tab', { active: activeTab === 'banners' })}
          onClick={() => setActiveTab('banners')}
        >
          Quản lý Banner
        </button>
        <button
          className={cx('tab', { active: activeTab === 'magazines' })}
          onClick={() => setActiveTab('magazines')}
        >
          Quản lý Tạp chí
        </button>
      </div>

      <section className={cx('filterBar')}>
        <div className={cx('filterRow')}>
          <input
            type="text"
            className={cx('searchInput')}
            placeholder="Tìm kiếm theo tiêu đề, mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="date"
            className={cx('dateInput')}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          {activeTab === 'banners' ? (
            <button type="button" className={cx('addBtn')} onClick={openAddBanner}>
              <FontAwesomeIcon icon={faPlus} />
              Thêm banner
            </button>
          ) : (
            <button type="button" className={cx('addBtn')} onClick={openAddMagazine}>
              <FontAwesomeIcon icon={faPlus} />
              Thêm Tạp chí
            </button>
          )}
        </div>
      </section>

      <div className={cx('contentSections')}>
        {bannerLoading ? (
          <div className={cx('loading')}>Đang tải dữ liệu...</div>
        ) : (
          <>
            {/* Banner Section */}
            {activeTab === 'banners' && (
              <div className={cx('section')}>
                <div className={cx('card')}>
                  <div className={cx('tableWrapper')}>
                    <table className={cx('table')}>
                      <thead>
                        <tr>
                          <th>Ảnh</th>
                          <th>Tiêu đề</th>
                          <th>Mô tả</th>
                          <th>Ngày bắt đầu</th>
                          <th>Ngày kết thúc</th>
                          <th>Sản phẩm</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBanners.filter((b) => !b.isMagazine).length === 0 ? (
                          <tr>
                            <td colSpan="7" className={cx('empty')}>
                              Không có banner nào
                            </td>
                          </tr>
                        ) : (
                          filteredBanners
                            .filter((b) => !b.isMagazine)
                            .map((banner) => (
                              <tr key={banner.id}>
                                <td>
                                  {banner.imageUrl ? (
                                    <img src={banner.imageUrl} alt={banner.title} className={cx('thumbnail')} />
                                  ) : (
                                    <span className={cx('noImage')}>-</span>
                                  )}
                                </td>
                                <td className={cx('titleCell')}>{banner.title}</td>
                                <td className={cx('descriptionCell')}>
                                  {banner.description ? (
                                    <span title={banner.description}>
                                      {banner.description.length > 50
                                        ? `${banner.description.substring(0, 50)}...`
                                        : banner.description}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td>{formatDate(banner.startDate)}</td>
                                <td>{formatDate(banner.endDate)}</td>
                                <td>
                                  {banner.productNames && banner.productNames.length > 0 ? (
                                    <span title={banner.productNames.join(', ')}>
                                      {banner.productNames.length} sản phẩm
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td>
                                  <div className={cx('actions')}>
                                    <button
                                      type="button"
                                      className={cx('actionBtn', 'viewBtn')}
                                      onClick={() => setDetailItem(banner)}
                                      title="Chi tiết"
                                    >
                                      <FontAwesomeIcon icon={faEye} />
                                    </button>
                                    <button
                                      type="button"
                                      className={cx('actionBtn', 'editBtn')}
                                      onClick={() => openEditBanner(banner)}
                                      title="Sửa"
                                    >
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button
                                      type="button"
                                      className={cx('actionBtn', 'deleteBtn')}
                                      onClick={() => handleDelete(banner.id)}
                                      title="Xóa"
                                    >
                                      <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Magazine Section */}
            {activeTab === 'magazines' && (
              <div className={cx('section', 'magazineSection')}>
                <div className={cx('card')}>
                  <div className={cx('tableWrapper')}>
                    <table className={cx('table')}>
                      <thead>
                        <tr>
                          <th>Ảnh</th>
                          <th>Tiêu đề</th>
                          <th>Danh mục</th>
                          <th>Mô tả</th>
                          <th>Ngày tạo</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBanners.filter((b) => b.isMagazine).length === 0 ? (
                          <tr>
                            <td colSpan="6" className={cx('empty')}>
                              Không có bài viết tạp chí nào
                            </td>
                          </tr>
                        ) : (
                          filteredBanners
                            .filter((b) => b.isMagazine)
                            .map((magazine) => (
                              <tr key={magazine.id}>
                                <td>
                                  {magazine.imageUrl ? (
                                    <img src={magazine.imageUrl} alt={magazine.title} className={cx('thumbnail')} />
                                  ) : (
                                    <span className={cx('noImage')}>-</span>
                                  )}
                                </td>
                                <td className={cx('titleCell')}>{magazine.title}</td>
                                <td>
                                  <span className={cx('categoryTag')}>{magazine.category || '-'}</span>
                                </td>
                                <td className={cx('descriptionCell')}>
                                  {magazine.description ? (
                                    <span title={magazine.description}>
                                      {stripHtml(magazine.description).length > 50
                                        ? `${stripHtml(magazine.description).substring(0, 50)}...`
                                        : stripHtml(magazine.description)}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td>{formatDate(magazine.createdAt)}</td>
                                <td>
                                  <div className={cx('actions')}>
                                    <button
                                      type="button"
                                      className={cx('actionBtn', 'viewBtn')}
                                      onClick={() => setDetailItem(magazine)}
                                      title="Chi tiết"
                                    >
                                      <FontAwesomeIcon icon={faEye} />
                                    </button>
                                    <button
                                      type="button"
                                      className={cx('actionBtn', 'editBtn')}
                                      onClick={() => openEditMagazine(magazine)}
                                      title="Sửa"
                                    >
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button
                                      type="button"
                                      className={cx('actionBtn', 'deleteBtn')}
                                      onClick={() => handleDelete(magazine.id)}
                                      title="Xóa"
                                    >
                                      <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Banner Form Modal */}
      <BannerFormModal
        open={showBannerModal}
        mode={bannerForm.id ? 'edit' : 'add'}
        formData={bannerForm}
        formErrors={bannerErrors}
        previewUrl={bannerImagePreview}
        uploadingImage={uploadingBannerImage}
        categories={categories}
        brandOptions={brandOptions}
        loadingCategories={loadingCategories}
        onClose={closeBannerModal}
        onChange={handleBannerFormChange}
        onSubmit={submitBanner}
        onFileChange={handleBannerImageChange}
        onSelectCategory={handleBannerCategorySelect}
        onSelectBrand={handleBannerBrandSelect}
        onSelectTargetType={handleTargetTypeChange}
        isStaff={userRole === 'STAFF'}
      />

      {/* Magazine Form Modal */}
      <MagazineFormModal
        open={showMagazineModal}
        mode={magazineForm.id ? 'edit' : 'add'}
        formData={magazineForm}
        formErrors={magazineErrors}
        previewUrl={magazineImagePreview}
        uploadingImage={uploadingMagazineImage}
        onClose={closeMagazineModal}
        onChange={handleMagazineChange}
        onSubmit={submitMagazine}
        onFileChange={handleMagazineFileChange}
      />

      {/* Detail Modal */}
      {detailItem && (
        <div className={cx('modalOverlay')} onClick={() => setDetailItem(null)}>
          <div className={cx('detailModal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('detailHeader')}>
              <h3>Chi tiết banner</h3>
              <button
                type="button"
                className={cx('closeBtn')}
                onClick={() => setDetailItem(null)}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
            </div>
            <div className={cx('detailBody')}>
              {detailItem.imageUrl && (
                <div className={cx('detailImage')}>
                  <img src={detailItem.imageUrl} alt={detailItem.title} />
                </div>
              )}
              <div className={cx('detailInfo')}>
                <div className={cx('detailRow')}>
                  <strong>Tiêu đề:</strong>
                  <span>{detailItem.title}</span>
                </div>
                {detailItem.description && (
                  <div className={cx('detailRow')}>
                    <strong>Mô tả:</strong>
                    <span>{detailItem.description}</span>
                  </div>
                )}
                <div className={cx('detailRow')}>
                  <strong>Ngày tạo:</strong>
                  <span>{formatDate(detailItem.createdAt)}</span>
                </div>
                <div className={cx('detailRow')}>
                  <strong>Ngày bắt đầu:</strong>
                  <span>{formatDate(detailItem.startDate)}</span>
                </div>
                <div className={cx('detailRow')}>
                  <strong>Ngày kết thúc:</strong>
                  <span>{formatDate(detailItem.endDate)}</span>
                </div>
                {detailItem.productNames && detailItem.productNames.length > 0 && (
                  <div className={cx('detailRow')}>
                    <strong>Sản phẩm:</strong>
                    <span>{detailItem.productNames.join(', ')}</span>
                  </div>
                )}
                {detailItem.rejectionReason && (
                  <div className={cx('detailRow')}>
                    <strong>Lý do từ chối:</strong>
                    <span className={cx('rejectionReason')}>{detailItem.rejectionReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffBanners;

