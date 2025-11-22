import { useEffect, useMemo, useState } from 'react';
import notify from '~/utils/notification';
import { getBanners, createBanner, updateBanner, deleteBanner } from '~/services/banner';
import { getActiveProducts } from '~/services/product';
import { uploadProductMedia } from '~/services/media';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';

const DEFAULT_BANNER_FORM = {
  id: '',
  title: '',
  description: '',
  imageUrl: '',
  startDate: '',
  endDate: '',
  status: true,
  productIds: [],
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

  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState(DEFAULT_BANNER_FORM);
  const [bannerErrors, setBannerErrors] = useState({});
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState('');
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);

  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    fetchProducts();
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
      productIds: [],
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
    
    setBannerForm({
      id: banner.id,
      title: banner.title || '',
      description: banner.description || '',
      imageUrl: banner.imageUrl || '',
      startDate: startDate,
      endDate: banner.endDate ? banner.endDate.split('T')[0] : '',
      status: banner.status !== false,
      productIds: banner.productIds || [],
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
  };

  const handleBannerFormChange = (field, value) => {
    setBannerForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleBannerProduct = (productId) => {
    setBannerForm((prev) => {
      const exists = prev.productIds.includes(productId);
      return {
        ...prev,
        productIds: exists
          ? prev.productIds.filter((id) => id !== productId)
          : [...prev.productIds, productId],
      };
    });
  };

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
    handleBannerImageChange,
    submitBanner,
    toggleBannerProduct,
    products,
  };
}

