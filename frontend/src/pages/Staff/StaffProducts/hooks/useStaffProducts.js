import { useEffect, useRef, useState } from 'react';
import { getMyProducts, createProduct, updateProduct, deleteProduct } from '~/services/product';
import { getCategories, getRootCategories, getSubCategories } from '~/services/category';
import { uploadProductMedia } from '~/services/media';
import notify from '~/utils/notification';
import { createStatusHelpers } from '~/utils/statusHelpers';
import { STAFF_PRODUCT_ERRORS, STAFF_PRODUCT_MESSAGES } from '../messages';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import {
  addStaffNotification,
  detectStatusNotifications,
  detectDeletionNotifications,
} from '~/utils/staffNotifications';
import {
  createEmptyVariantFormState,
  mapVariantsToFormState,
  buildVariantPayload,
  serializeVariantPayload,
} from '~/utils/colorVariants';

export const MAX_MEDIA_ITEMS = 6;

const STATUS_CONFIG = {
  DA_DUYET: { label: 'Đã duyệt', class: 'approved' },
  CHO_DUYET: { label: 'Chờ duyệt', class: 'pending' },
  TU_CHOI: { label: 'Bị từ chối', class: 'rejected' },
};

const { normalizeStatus, getNormalizedProductStatus, formatStatusDisplay } =
  createStatusHelpers(STATUS_CONFIG);

const getInitialFormData = (overrides = {}) => ({
  productId: '',
  name: '',
  description: '',
  size: '',
  brand: '',
  brandOrigin: '',
  texture: '',
  skinType: '',
  reviewHighlights: '',
  ingredients: '',
  uses: '',
  usageInstructions: '',
  weight: '',
  price: '',
  tax: '8', // Thuế cố định 8%
  publicationDate: '',
  categoryId: '',
  stockQuantity: '',
  hasColorVariants: false,
  colorVariants: [],
  ...overrides,
});

const ensureVariantList = (variants = []) =>
  variants.length > 0 ? variants : [createEmptyVariantFormState()];

const cleanupVariantPreviews = (variants = []) => {
  variants.forEach((variant) => {
    if (variant?.imagePreview && variant.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(variant.imagePreview);
    }
  });
};

const inferMediaType = (url = '') => {
  if (!url) return 'IMAGE';
  const normalized = url.split('?')[0]?.toLowerCase() || '';
  const videoExtensions = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.ogg'];
  return videoExtensions.some((ext) => normalized.endsWith(ext)) ? 'VIDEO' : 'IMAGE';
};

const buildExistingMediaFiles = (product) => {
  const urls = product?.mediaUrls || [];
  const defaultUrl = product?.defaultMediaUrl || urls[0] || '';
  return urls.map((url, index) => ({
    id: `existing-${index}`,
    file: null,
    type: inferMediaType(url),
    preview: url,
    uploadedUrl: url,
    isDefault: defaultUrl ? url === defaultUrl : index === 0,
  }));
};

export function useStaffProductsState() {
  const currentUserRef = useRef(storage.get(STORAGE_KEYS.USER));
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [formData, setFormData] = useState(() => getInitialFormData());
  const [formErrors, setFormErrors] = useState({});
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();

    const handleCategoriesUpdated = () => {
      fetchCategories();
    };
    window.addEventListener('categoriesUpdated', handleCategoriesUpdated);

    return () => {
      window.removeEventListener('categoriesUpdated', handleCategoriesUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedDate, statusFilter, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getMyProducts();
      const list = data || [];
      setProducts(list);
      setFilteredProducts(list);
      handleProductStatusNotifications(list);
      handleDeletedProductNotifications(list);
    } catch (err) {
      console.error('Error fetching products:', err);
      notify.error('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductStatusNotifications = (productList = []) => {
    const userId = currentUserRef.current?.id;
    if (!userId || !Array.isArray(productList)) return;

    const notifications = detectStatusNotifications({
      categoryKey: 'PRODUCTS',
      userId,
      items: productList,
      getItemId: (item) => item?.id,
      getStatus: (item) => getNormalizedProductStatus(item),
      buildNotification: (item, status) => {
        if (status === 'DA_DUYET') {
          return {
            title: 'Sản phẩm đã được duyệt',
            message: `Sản phẩm "${item.name || item.id}" đã được admin phê duyệt.`,
            type: 'success',
            targetPath: '/staff/products',
          };
        }
        if (status === 'TU_CHOI') {
          const reason = item.rejectionReason ? ` Lý do: ${item.rejectionReason}` : '';
          return {
            title: 'Sản phẩm bị từ chối',
            message: `Sản phẩm "${item.name || item.id}" bị từ chối.${reason}`,
            type: 'warning',
            targetPath: '/staff/products',
          };
        }
        return null;
      },
    });

    notifications.forEach((notification) => {
      addStaffNotification(userId, notification);
    });
  };

  const handleDeletedProductNotifications = (productList = []) => {
    const userId = currentUserRef.current?.id;
    if (!userId || !Array.isArray(productList)) return;

    const notifications = detectDeletionNotifications({
      categoryKey: 'PRODUCTS',
      userId,
      items: productList,
      getItemId: (item) => item?.id,
      getItemName: (item) => item?.name || item?.id,
      buildNotification: ({ id, name }) => ({
        title: 'Sản phẩm đã bị xóa',
        message: `Sản phẩm "${name || id}" đã bị xóa khỏi hệ thống (Do admin xóa).`,
        type: 'info',
        targetPath: '/staff/products',
      }),
    });

    notifications.forEach((notification) => {
      addStaffNotification(userId, notification);
    });
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const rootData = await getRootCategories();
      const activeRootCategories = (rootData || []).filter((cat) => cat.status !== false);
      const allCategories = [...activeRootCategories];
      const treeStructure = [];

      for (const rootCat of activeRootCategories) {
        try {
          const subCats = await getSubCategories(rootCat.id);
          const activeSubCats = (subCats || []).filter((cat) => cat.status !== false);
          allCategories.push(...activeSubCats);

          treeStructure.push({
            ...rootCat,
            children: activeSubCats,
          });
        } catch (subErr) {
          console.warn(`Error fetching subcategories for ${rootCat.id}:`, subErr);
          treeStructure.push({
            ...rootCat,
            children: [],
          });
        }
      }

      setCategories(allCategories);
      setCategoriesTree(treeStructure);
    } catch (err) {
      console.error('Error fetching categories:', err);
      try {
        const allData = await getCategories();
        const activeData = (allData || []).filter((cat) => cat.status !== false);
        setCategories(activeData);

        const rootCats = activeData.filter((cat) => !cat.parentId);
        const tree = rootCats.map((root) => ({
          ...root,
          children: activeData.filter((cat) => cat.parentId === root.id),
        }));
        setCategoriesTree(tree);
      } catch (fallbackErr) {
        console.error('Error fetching all categories:', fallbackErr);
        setCategories([]);
        setCategoriesTree([]);
      }
    } finally {
      setLoadingCategories(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name?.toLowerCase().includes(term) ||
          product.id?.toLowerCase().includes(term) ||
          product.categoryName?.toLowerCase().includes(term),
      );
    }
    if (selectedDate) {
      const filterDate = new Date(selectedDate).toISOString().split('T')[0];
      filtered = filtered.filter((product) => {
        if (!product.createdAt) return false;
        const productDate = new Date(product.createdAt).toISOString().split('T')[0];
        return productDate === filterDate;
      });
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (product) => getNormalizedProductStatus(product) === statusFilter,
      );
    }
    setFilteredProducts(filtered);
  };

  const resetFormState = (overrides = {}, nextMediaFiles = []) => {
    setFormData(getInitialFormData(overrides));
    setMediaFiles(nextMediaFiles);
    setFormErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadingMedia(false);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    resetFormState(
      {
        publicationDate: new Date().toISOString().split('T')[0],
      },
      [],
    );
    setIsEditModalOpen(false);
    setIsAddModalOpen(true);
  };

  const handleEdit = (product) => {
    if (!product) return;
    setEditingProduct(product);
    const existingMedia = buildExistingMediaFiles(product);

    const variantForms = mapVariantsToFormState(product.manufacturingLocation);
    const hasVariants = variantForms.length > 0;

    resetFormState(
      {
        productId: product.id || '',
        name: product.name || '',
        description: product.description || '',
        size: product.size || '',
        brand: product.brand || '',
        brandOrigin: product.brandOrigin || '',
        texture: product.texture || '',
        skinType: product.skinType || '',
        reviewHighlights: product.characteristics || '',
        ingredients: product.ingredients || '',
        uses: product.uses || '',
        usageInstructions: product.usageInstructions || '',
        weight: product.weight?.toString() || '',
        price:
          product.unitPrice?.toString() ||
          (product.price ? (product.price / 1.08).toFixed(0) : ''),
        tax: product.tax ? (product.tax * 100).toString() : '8',
        publicationDate: product.publicationDate || new Date().toISOString().split('T')[0],
        categoryId: product.categoryId || product.category?.id || '',
        stockQuantity: hasVariants ? '' : product.stockQuantity?.toString() || '',
        hasColorVariants: hasVariants,
        colorVariants: hasVariants ? variantForms : [],
      },
      existingMedia,
    );
    setIsAddModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    cleanupVariantPreviews(formData.colorVariants);
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingProduct(null);
    resetFormState();
  };

  const MAX_FILE_SIZE_MB = 100;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleMediaSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = MAX_MEDIA_ITEMS - mediaFiles.length;
    if (remainingSlots <= 0) {
      notify.warning(STAFF_PRODUCT_MESSAGES.mediaLimitReached(MAX_MEDIA_ITEMS));
      if (event.target) event.target.value = '';
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const isImage = file.type?.toLowerCase().startsWith('image');
        const typeLabel = isImage ? 'ảnh' : 'file';
        notify.error(
          `Dung lượng ${typeLabel} "${file.name}" vượt quá giới hạn ${MAX_FILE_SIZE_MB}MB. ` +
            'Vui lòng chọn ' +
            (isImage ? 'ảnh' : 'file') +
            ' có dung lượng nhỏ hơn.',
        );
        return false;
      }
      return true;
    });

    if (!validFiles.length) {
      if (event.target) event.target.value = '';
      return;
    }

    const filesToUse = validFiles.slice(0, remainingSlots);
    const mapped = filesToUse.map((file, idx) => ({
      id: `local-${Date.now()}-${idx}`,
      file,
      type: file.type?.toLowerCase().startsWith('video') ? 'VIDEO' : 'IMAGE',
      preview: URL.createObjectURL(file),
      uploadedUrl: null,
      isDefault: false,
    }));

    setMediaFiles((prev) => {
      const next = [...prev, ...mapped];
      if (next.length && !next.some((item) => item.isDefault)) {
        next[0].isDefault = true;
      }
      return next.slice(0, MAX_MEDIA_ITEMS);
    });

    if (event.target) {
      event.target.value = '';
    }
  };

  const handleFormDataChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleColorVariants = () => {
    setFormData((prev) => {
      const nextValue = !prev.hasColorVariants;
      if (!nextValue && prev.colorVariants) {
        cleanupVariantPreviews(prev.colorVariants);
      }
      return {
        ...prev,
        hasColorVariants: nextValue,
        colorVariants: nextValue ? ensureVariantList(prev.colorVariants || []) : [],
      };
    });
  };

  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      colorVariants: [...(prev.colorVariants || []), createEmptyVariantFormState()],
    }));
  };

  const handleRemoveVariant = (index) => {
    setFormData((prev) => {
      const variants = [...(prev.colorVariants || [])];
      const target = variants[index];
      if (target) {
        cleanupVariantPreviews([target]);
      }
      return {
        ...prev,
        colorVariants: variants.filter((_, i) => i !== index),
      };
    });
  };

  const handleVariantChange = (index, field, value) => {
    setFormData((prev) => {
      const variants = [...(prev.colorVariants || [])];
      if (!variants[index]) return prev;
      variants[index] = {
        ...variants[index],
        [field]: value,
      };
      return {
        ...prev,
        colorVariants: variants,
      };
    });
  };

  const handleVariantStockChange = (index, value) => {
    if (value === '' || /^\d+$/.test(value)) {
      handleVariantChange(index, 'stockQuantity', value);
    }
  };

  const handleVariantImageChange = (index, file) => {
    if (!file) return;
    setFormData((prev) => {
      const variants = [...(prev.colorVariants || [])];
      const target = variants[index];
      if (!target) return prev;
      if (target.imagePreview && target.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(target.imagePreview);
      }
      variants[index] = {
        ...target,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
        imageUrl: '',
      };
      return {
        ...prev,
        colorVariants: variants,
      };
    });
  };

  const handleRemoveMedia = (index) => {
    setMediaFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length && !next.some((item) => item.isDefault)) {
        next[0].isDefault = true;
      }
      return next;
    });
  };

  const handleSetDefaultMedia = (index) => {
    setMediaFiles((prev) =>
      prev.map((item, idx) => ({
        ...item,
        isDefault: idx === index,
      })),
    );
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.productId?.trim()) errors.productId = STAFF_PRODUCT_ERRORS.productId;
    if (!formData.name?.trim()) errors.name = STAFF_PRODUCT_ERRORS.name;
    if (!formData.brand?.trim()) errors.brand = STAFF_PRODUCT_ERRORS.brand;
    if (!formData.texture?.trim()) errors.texture = 'Kết cấu không được để trống';
    if (!formData.skinType?.trim()) errors.skinType = 'Loại da không được để trống';
    if (!formData.description?.trim())
      errors.description = STAFF_PRODUCT_ERRORS.descriptionShort;
    if (!formData.ingredients?.trim()) errors.ingredients = STAFF_PRODUCT_ERRORS.ingredients;
    if (!formData.uses?.trim()) errors.uses = STAFF_PRODUCT_ERRORS.uses;
    if (!formData.usageInstructions?.trim())
      errors.usageInstructions = STAFF_PRODUCT_ERRORS.usageInstructions;
    const imageCount = mediaFiles.filter((item) => item.type !== 'VIDEO').length;
    if (imageCount === 0) {
      errors.mediaFiles = STAFF_PRODUCT_ERRORS.mediaRequired;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = STAFF_PRODUCT_ERRORS.price;
    }
    if (!formData.categoryId) errors.categoryId = STAFF_PRODUCT_ERRORS.category;

    if (formData.weight && formData.weight !== '') {
      const weight = parseFloat(formData.weight);
      if (Number.isNaN(weight) || weight < 0) {
        errors.weight = STAFF_PRODUCT_ERRORS.weight;
      }
    }

    if (formData.tax && formData.tax !== '') {
      const tax = parseFloat(formData.tax);
      if (Number.isNaN(tax) || tax < 0) {
        errors.tax = STAFF_PRODUCT_ERRORS.tax;
      }
    }

    if (formData.hasColorVariants) {
      if (!formData.colorVariants || formData.colorVariants.length === 0) {
        errors.colorVariants = 'Vui lòng thêm ít nhất một mã màu.';
      } else {
        for (let i = 0; i < formData.colorVariants.length; i += 1) {
          const variant = formData.colorVariants[i];
          const displayName = variant.name || variant.code || `Mã màu ${i + 1}`;
          if (!variant.name?.trim() && !variant.code?.trim()) {
            errors.colorVariants = `Mã màu thứ ${i + 1} cần tên hoặc mã màu.`;
            break;
          }
          if (variant.stockQuantity === '' || variant.stockQuantity === undefined) {
            errors.colorVariants = `Vui lòng nhập tồn kho cho ${displayName}.`;
            break;
          }
          if (!/^\d+$/.test(String(variant.stockQuantity))) {
            errors.colorVariants = `Tồn kho của ${displayName} phải là số nguyên không âm.`;
            break;
          }
          if (!variant.imageUrl && !variant.imageFile) {
            errors.colorVariants = `Vui lòng chọn ảnh cho ${displayName}.`;
            break;
          }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadPendingMedia = async () => {
    const pending = mediaFiles.filter((item) => item.file && !item.uploadedUrl);
    if (!pending.length) return mediaFiles;

    const filesToUpload = pending.map((item) => item.file);
    const uploadedUrls = await uploadProductMedia(filesToUpload);
    if (!uploadedUrls || uploadedUrls.length !== pending.length) {
      throw new Error(STAFF_PRODUCT_MESSAGES.mediaUploadError);
    }

    let urlIndex = 0;
    const nextMedia = mediaFiles.map((item) => {
      if (item.file && !item.uploadedUrl) {
        return {
          ...item,
          uploadedUrl: uploadedUrls[urlIndex++] || null,
        };
      }
      return item;
    });
    setMediaFiles(nextMedia);
    return nextMedia;
  };

  const uploadVariantImages = async (variants = []) => {
    const pending = variants
      .map((variant, index) => ({ variant, index }))
      .filter(({ variant }) => variant.imageFile && !variant.imageUrl);

    if (!pending.length) return variants;

    const files = pending.map(({ variant }) => variant.imageFile);
    const uploadedUrls = await uploadProductMedia(files);
    if (!uploadedUrls || uploadedUrls.length !== pending.length) {
      throw new Error(STAFF_PRODUCT_MESSAGES.mediaUploadError);
    }

    const uploadMap = {};
    pending.forEach((item, idx) => {
      uploadMap[item.index] = uploadedUrls[idx] || '';
    });

    return variants.map((variant, index) => {
      if (uploadMap[index]) {
        return {
          ...variant,
          imageUrl: uploadMap[index],
          imagePreview: uploadMap[index],
          imageFile: null,
        };
      }
      return variant;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setUploadingMedia(true);
    try {
      const finalMediaList = await uploadPendingMedia();
      const imageUrls = finalMediaList
        .filter((item) => item.type !== 'VIDEO' && item.uploadedUrl)
        .map((item) => item.uploadedUrl);
      if (!imageUrls.length) {
        throw new Error(STAFF_PRODUCT_MESSAGES.imageRequired);
      }
      const videoUrls = finalMediaList
        .filter((item) => item.type === 'VIDEO' && item.uploadedUrl)
        .map((item) => item.uploadedUrl);
      const defaultMedia =
        finalMediaList.find((item) => item.isDefault && item.uploadedUrl) ||
        finalMediaList.find((item) => item.uploadedUrl);
      let updatedVariants = formData.colorVariants || [];
      if (formData.hasColorVariants) {
        updatedVariants = await uploadVariantImages(updatedVariants);
        setFormData((prev) => ({
          ...prev,
          colorVariants: updatedVariants,
        }));
      }
      const variantPayload = formData.hasColorVariants ? buildVariantPayload(updatedVariants) : [];
      const manufacturingLocation =
        formData.hasColorVariants && variantPayload.length > 0
          ? serializeVariantPayload(variantPayload)
          : null;
      const stockQuantity =
        formData.hasColorVariants || !formData.stockQuantity
          ? null
          : parseInt(formData.stockQuantity, 10);

      const submitData = {
        id: formData.productId.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        author: formData.texture?.trim() || null,
        publisher: formData.skinType?.trim() || null,
        size: formData.size?.trim() || null,
        brand: formData.brand?.trim() || null,
        brandOrigin: formData.brandOrigin?.trim() || null,
        texture: formData.texture?.trim() || null,
        skinType: formData.skinType?.trim() || null,
        characteristics: formData.reviewHighlights?.trim() || null,
        ingredients: formData.ingredients?.trim() || null,
        uses: formData.uses?.trim() || null,
        usageInstructions: formData.usageInstructions?.trim() || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        stockQuantity,
        manufacturingLocation,
        unitPrice: parseFloat(formData.price),
        tax: formData.tax ? parseFloat(formData.tax) / 100 : 0.08,
        publicationDate: formData.publicationDate || null,
        categoryId: formData.categoryId,
        imageUrls,
        videoUrls,
        defaultMediaUrl: defaultMedia?.uploadedUrl || imageUrls[0] || null,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, submitData);
        notify.success(STAFF_PRODUCT_MESSAGES.updateSuccess);
      } else {
        await createProduct(submitData);
        notify.success(STAFF_PRODUCT_MESSAGES.createSuccess);
      }

      handleCloseModal();
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      if (
        err.code === 403 ||
        err.status === 403 ||
        err.message?.includes('permission') ||
        err.message?.includes('quyền')
      ) {
        notify.error(
          'Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại bằng tài khoản nhân viên.',
        );
      } else if (err.code === 401 || err.status === 401) {
        notify.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        notify.error(err.message || STAFF_PRODUCT_MESSAGES.saveError);
      }
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDelete = async (productId) => {
    const confirmed = await notify.confirm(
      STAFF_PRODUCT_MESSAGES.deleteConfirm.message,
      STAFF_PRODUCT_MESSAGES.deleteConfirm.title,
      STAFF_PRODUCT_MESSAGES.deleteConfirm.confirmText,
      STAFF_PRODUCT_MESSAGES.deleteConfirm.cancelText,
    );

    if (!confirmed) return;

    try {
      await deleteProduct(productId);
      setProducts(products.filter((p) => p.id !== productId));
      notify.success(STAFF_PRODUCT_MESSAGES.deleteSuccess);
    } catch (err) {
      console.error('Error deleting product:', err);
      notify.error(STAFF_PRODUCT_MESSAGES.deleteError);
    }
  };

  const handleViewDetail = (product) => {
    setViewingProduct(product);
  };

  const handleCloseViewDetail = () => {
    setViewingProduct(null);
  };

  const formatPrice = (price) => {
    const value = Math.round(Number(price) || 0);
    return (
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' ₫'
    );
  };

  const getStatusBadge = (status, product) => {
    const normalized = getNormalizedProductStatus(product || { status });
    const statusInfo =
      STATUS_CONFIG[normalized] || {
        label: formatStatusDisplay(status),
        class: 'default',
      };
    return <span className={`statusBadge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  return {
    loading,
    products,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    selectedDate,
    setSelectedDate,
    statusFilter,
    setStatusFilter,
    categories,
    categoriesTree,
    loadingCategories,
    formData,
    formErrors,
    mediaFiles,
    fileInputRef,
    uploadingMedia,
    isAddModalOpen,
    isEditModalOpen,
    viewingProduct,
    handleAdd,
    handleEdit,
    handleCloseModal,
    handleFormDataChange,
    handleMediaSelect,
    handleRemoveMedia,
    handleSetDefaultMedia,
    handleToggleColorVariants,
    handleAddVariant,
    handleRemoveVariant,
    handleVariantChange,
    handleVariantStockChange,
    handleVariantImageChange,
    handleSubmit,
    handleDelete,
    handleViewDetail,
    handleCloseViewDetail,
    formatPrice,
    getStatusBadge,
    filterProducts,
    getNormalizedProductStatus,
  };
}


