import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faArrowLeft, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './StaffProducts.module.scss';
import AddProductPage from './components/AddProduct/AddProductPage';
import UpdateProductPage from './components/UpdateProduct/UpdateProductPage';
import ProductDetailPage from './components/ProductDetail/ProductDetailPage';
import { getMyProducts, createProduct, updateProduct } from '~/services/product';
import { uploadProductMedia } from '~/services/media';
import notify from '~/utils/notification';
import { STAFF_PRODUCT_ERRORS, STAFF_PRODUCT_MESSAGES } from './messages';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import {
  addStaffNotification,
  detectDeletionNotifications,
} from '~/utils/staffNotifications';
import {
  createEmptyVariantFormState,
  mapVariantsToFormState,
  buildVariantPayload,
  serializeVariantPayload,
  normalizeVariantRecords,
  getVariantLabel,
} from '~/utils/productVariants';
import { useCategories } from '~/hooks';
import fallbackImage from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);
export const MAX_MEDIA_ITEMS = 6;


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
  length: '',
  width: '',
  height: '',
  weight: '',
  price: '',
  purchasePrice: '',
  tax: '8', // Thuế cố định 8%
  publicationDate: '',
  categoryId: '',
  stockQuantity: '',
  hasColorVariants: false,
  colorVariants: [],
  variantSamePrice: true, // Mặc định cùng giá
  variantLabel: 'Mã màu', // Tiêu đề mặc định
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

function StaffProducts() {
  const navigate = useNavigate();
  const currentUserRef = useRef(storage.get(STORAGE_KEYS.USER));
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  
  // Sử dụng useCategories hook để tái sử dụng logic
  const { categories: allCategories, loading: loadingCategories } = useCategories({
    type: 'all', // Load tất cả để có thể build tree với subcategories
    autoLoad: true,
    filterInactive: true,
  });

  // Build categories tree từ allCategories - tối ưu với useMemo
  const categoriesTree = useMemo(() => {
    if (!allCategories || allCategories.length === 0) return [];
    
    const rootCats = allCategories.filter((cat) => !cat.parentId);
    return rootCats.map((root) => ({
      ...root,
      children: allCategories.filter((cat) => cat.parentId === root.id),
    }));
  }, [allCategories]);

  const categories = allCategories;
  const [formData, setFormData] = useState(() => getInitialFormData());
  const [formErrors, setFormErrors] = useState({});
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    // useCategories hook đã tự động load và lắng nghe events
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedDate, products]);

  // Helper function để tính tổng tồn kho của một sản phẩm
  const calculateTotalStock = (product) => {
    if (product.manufacturingLocation) {
      const variants = normalizeVariantRecords(product.manufacturingLocation);
      if (variants.length > 0) {
        return variants.reduce((sum, variant) => {
          const stock = variant.stockQuantity;
          return sum + (stock !== null && stock !== undefined ? Number(stock) : 0);
        }, 0);
      }
    }
    return product.stockQuantity !== null && product.stockQuantity !== undefined 
      ? Number(product.stockQuantity) 
      : 0;
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getMyProducts();
      const list = data || [];
      setProducts(list);
      setFilteredProducts(list);
      handleDeletedProductNotifications(list);
      
      // Kiểm tra và thông báo sản phẩm hết hàng (tồn kho = 0) và sắp hết (tồn kho < 50)
      // Bao gồm cả kiểm tra từng mã màu nếu có
      const outOfStockProducts = [];
      const lowStockProducts = [];
      const outOfStockVariants = [];
      const lowStockVariants = [];
      
      list.forEach((product) => {
        const totalStock = calculateTotalStock(product);
        
        // Kiểm tra sản phẩm không có variants
        if (!product.manufacturingLocation) {
          if (totalStock === 0) {
            outOfStockProducts.push(product);
          } else if (totalStock > 0 && totalStock < 50) {
            lowStockProducts.push(product);
          }
        } else {
          // Kiểm tra từng mã màu
          const variants = normalizeVariantRecords(product.manufacturingLocation);
          variants.forEach((variant) => {
            const stock = variant.stockQuantity !== null && variant.stockQuantity !== undefined 
              ? Number(variant.stockQuantity) 
              : 0;
            const variantName = variant.name || variant.code || 'Mã màu';
            const variantCode = variant.code || '';
            const displayName = variantCode ? `${variantName} (${variantCode})` : variantName;
            
            if (stock === 0) {
              outOfStockVariants.push({
                productName: product.name || product.id,
                variantName: displayName,
              });
            } else if (stock > 0 && stock < 50) {
              lowStockVariants.push({
                productName: product.name || product.id,
                variantName: displayName,
                stock,
              });
            }
          });
          
          // Nếu tất cả mã màu đều hết hàng, thêm vào danh sách sản phẩm hết hàng
          if (totalStock === 0 && variants.length > 0) {
            outOfStockProducts.push(product);
          } else if (totalStock > 0 && totalStock < 50 && variants.length > 0) {
            lowStockProducts.push(product);
          }
        }
      });
      
      // Thêm thông báo vào hệ thống notification của staff thay vì popup
      const userId = currentUserRef.current?.id;
      if (userId) {
        // Thông báo mã màu hết hàng (ưu tiên cao nhất)
        if (outOfStockVariants.length > 0) {
          const variantInfo = outOfStockVariants
            .slice(0, 3)
            .map((v) => `${v.productName} - ${v.variantName}`)
            .join(', ');
          const moreCount = outOfStockVariants.length > 3 ? ` và ${outOfStockVariants.length - 3} mã màu khác` : '';
          addStaffNotification(userId, {
            title: 'Cảnh báo: Mã màu hết hàng',
            message: `Có ${outOfStockVariants.length} mã màu đã hết hàng: ${variantInfo}${moreCount}. Vui lòng nhập hàng ngay!`,
            type: 'error',
            targetPath: '/staff/products',
          });
        }
        
        // Thông báo sản phẩm hết hàng (ưu tiên)
        if (outOfStockProducts.length > 0) {
          const productNames = outOfStockProducts
            .slice(0, 3)
            .map((p) => p.name || p.id)
            .join(', ');
          const moreCount = outOfStockProducts.length > 3 ? ` và ${outOfStockProducts.length - 3} sản phẩm khác` : '';
          addStaffNotification(userId, {
            title: 'Cảnh báo: Sản phẩm hết hàng',
            message: `Có ${outOfStockProducts.length} sản phẩm đã hết hàng (tồn kho = 0): ${productNames}${moreCount}. Vui lòng nhập hàng ngay!`,
            type: 'error',
            targetPath: '/staff/products',
          });
        }
        
        // Thông báo mã màu sắp hết
        if (lowStockVariants.length > 0) {
          const variantInfo = lowStockVariants
            .slice(0, 3)
            .map((v) => `${v.productName} - ${v.variantName} (${v.stock})`)
            .join(', ');
          const moreCount = lowStockVariants.length > 3 ? ` và ${lowStockVariants.length - 3} mã màu khác` : '';
          addStaffNotification(userId, {
            title: 'Cảnh báo: Mã màu sắp hết',
            message: `Có ${lowStockVariants.length} mã màu sắp hết (tồn kho < 50): ${variantInfo}${moreCount}. Vui lòng kiểm tra và nhập thêm hàng.`,
            type: 'warning',
            targetPath: '/staff/products',
          });
        }
        
        // Thông báo sản phẩm sắp hết
        if (lowStockProducts.length > 0) {
          const productNames = lowStockProducts
            .slice(0, 3)
            .map((p) => p.name || p.id)
            .join(', ');
          const moreCount = lowStockProducts.length > 3 ? ` và ${lowStockProducts.length - 3} sản phẩm khác` : '';
          addStaffNotification(userId, {
            title: 'Cảnh báo: Sản phẩm sắp hết',
            message: `Có ${lowStockProducts.length} sản phẩm sắp hết (tồn kho < 50): ${productNames}${moreCount}. Vui lòng kiểm tra và nhập thêm hàng.`,
            type: 'warning',
            targetPath: '/staff/products',
          });
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      notify.error('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
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
    
    // Lấy variantLabel từ manufacturingLocation
    const variantLabel = getVariantLabel(product.manufacturingLocation);
    
    // Kiểm tra xem có variant nào có giá riêng không
    const hasVariantPrices = variantForms.some(v => v.price && parseFloat(v.price) > 0);
    const variantSamePrice = !hasVariantPrices; // Nếu không có variant nào có giá riêng thì cùng giá

    // Nếu khác giá, lấy giá từ variant đầu tiên để hiển thị
    let displayPrice = '';
    let displayPurchasePrice = '';
    if (hasVariants && !variantSamePrice && variantForms.length > 0) {
      displayPrice = variantForms[0].price || '';
      displayPurchasePrice = variantForms[0].purchasePrice || '';
    } else {
      displayPrice =
        product.unitPrice?.toString() ||
        (product.price && product.tax
          ? (product.price / (1 + product.tax)).toFixed(0)
          : product.price
          ? (product.price / 1.08).toFixed(0)
          : '');
      displayPurchasePrice = product.purchasePrice?.toString() || '';
    }

    resetFormState(
      {
        productId: product.id || '',
        name: product.name || '',
        description: product.description || '',
        brand: product.brand || '',
        brandOrigin: product.brandOrigin || '',
        texture: product.texture || '',
        skinType: product.skinType || '',
        reviewHighlights: product.characteristics || '',
        ingredients: product.ingredients || '',
        uses: product.uses || '',
        usageInstructions: product.usageInstructions || '',
        length: product.length?.toString() || '',
        width: product.width?.toString() || '',
        height: product.height?.toString() || '',
        weight: product.weight?.toString() || '',
        price: displayPrice,
        purchasePrice: displayPurchasePrice,
        tax: product.tax ? (product.tax * 100).toString() : '8',
        publicationDate: product.publicationDate || new Date().toISOString().split('T')[0],
        categoryId: product.categoryId || product.category?.id || '',
        stockQuantity: hasVariants ? '' : product.stockQuantity?.toString() || '',
        hasColorVariants: hasVariants,
        colorVariants: hasVariants ? variantForms : [],
        variantSamePrice: variantSamePrice,
        variantLabel: variantLabel, // Lấy variantLabel từ JSON
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

  // Helper function để validate tất cả mã màu và cập nhật errors
  const validateAllVariantCodes = (variants) => {
    const newErrors = {};
    const codeMap = new Map();

    // Kiểm tra trùng lặp mã màu
    for (let i = 0; i < variants.length; i += 1) {
      const variant = variants[i];
      const code = variant.code?.trim();

      if (code) {
        // Case-insensitive comparison
        const codeLower = code.toLowerCase();
        if (codeMap.has(codeLower)) {
          const duplicateIndex = codeMap.get(codeLower);
          const duplicateName = variants[duplicateIndex].name || `Mã màu ${duplicateIndex + 1}`;
          const currentName = variant.name || `Mã màu ${i + 1}`;
          newErrors[`variantCode_${i}`] = `Mã màu "${code}" đã được sử dụng ở "${duplicateName}".`;
          // Cũng set error cho variant bị trùng đầu tiên
          if (!newErrors[`variantCode_${duplicateIndex}`]) {
            newErrors[`variantCode_${duplicateIndex}`] = `Mã màu "${code}" đã được sử dụng ở "${currentName}".`;
          }
        } else {
          codeMap.set(codeLower, i);
        }
      }
    }

    // Cập nhật errors
    setFormErrors((prevErrors) => {
      const updatedErrors = { ...prevErrors };
      // Xóa tất cả variantCode errors cũ
      Object.keys(updatedErrors).forEach((key) => {
        if (key.startsWith('variantCode_')) {
          delete updatedErrors[key];
        }
      });
      // Thêm errors mới
      Object.assign(updatedErrors, newErrors);
      return updatedErrors;
    });
  };

  const handleAddVariant = () => {
    setFormData((prev) => {
      const newVariants = [...(prev.colorVariants || []), createEmptyVariantFormState()];
      // Validate lại tất cả mã màu sau khi thêm
      validateAllVariantCodes(newVariants);
      return {
        ...prev,
        colorVariants: newVariants,
      };
    });
  };

  const handleRemoveVariant = (index) => {
    setFormData((prev) => {
      const variants = [...(prev.colorVariants || [])];
      const target = variants[index];
      if (target) {
        cleanupVariantPreviews([target]);
      }
      const newVariants = variants.filter((_, i) => i !== index);
      // Validate lại tất cả mã màu sau khi xóa
      validateAllVariantCodes(newVariants);
      return {
        ...prev,
        colorVariants: newVariants,
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

      // Nếu đang thay đổi mã màu, validate lại tất cả mã màu
      if (field === 'code') {
        validateAllVariantCodes(variants);
      }

      // Nếu khác giá và đang thay đổi giá của variant đầu tiên, tự động cập nhật giá ở trên
      if (prev.hasColorVariants && prev.variantSamePrice === false && index === 0) {
        if (field === 'price') {
          // Không cập nhật formData.price vì nó sẽ được hiển thị từ variant[0].price
        } else if (field === 'purchasePrice') {
          // Không cập nhật formData.purchasePrice vì nó sẽ được hiển thị từ variant[0].purchasePrice
        }
      }

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

  const handleVariantPriceChange = (index, field, value) => {
    // Chỉ cho phép số nguyên (không có dấu thập phân)
    if (value === '' || /^\d+$/.test(value)) {
      handleVariantChange(index, field, value);
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
    if (!formData.productId?.trim()) {
      errors.productId = STAFF_PRODUCT_ERRORS.productId;
    } else {
      // Kiểm tra mã sản phẩm không được trùng với các sản phẩm khác
      const productIdTrimmed = formData.productId.trim();
      const duplicateProduct = products.find(
        (p) => p.id?.toLowerCase() === productIdTrimmed.toLowerCase() &&
        (!editingProduct || p.id !== editingProduct.id)
      );
      if (duplicateProduct) {
        errors.productId = 'Mã sản phẩm này đã tồn tại. Vui lòng sử dụng mã khác.';
      }
    }
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
    // Kiểm tra giá sản phẩm: phải > 0, trừ khi có variants với giá riêng
    if (formData.hasColorVariants && formData.variantSamePrice === false) {
      // Nếu khác giá, không cần kiểm tra giá ở trên (giá sẽ lấy từ variants)
      // Nhưng vẫn cần kiểm tra variants có giá > 0 (đã kiểm tra ở dưới)
    } else {
      // Nếu cùng giá hoặc không có variants, giá sản phẩm phải > 0
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = STAFF_PRODUCT_ERRORS.price;
      } else {
        // Kiểm tra giá nhập không được lớn hơn giá niêm yết
        if (formData.purchasePrice && parseFloat(formData.purchasePrice) > 0) {
          const unitPrice = parseFloat(formData.price);
          const purchasePrice = parseFloat(formData.purchasePrice);
          if (purchasePrice > unitPrice) {
            errors.purchasePrice = 'Giá nhập không được lớn hơn giá niêm yết.';
          }
        }
      }
    }
    if (!formData.categoryId) errors.categoryId = STAFF_PRODUCT_ERRORS.category;

    if (formData.length && formData.length !== '') {
      const length = parseFloat(formData.length);
      if (Number.isNaN(length) || length < 0) {
        errors.length = 'Chiều dài phải là số lớn hơn hoặc bằng 0';
      }
    }
    if (formData.width && formData.width !== '') {
      const width = parseFloat(formData.width);
      if (Number.isNaN(width) || width < 0) {
        errors.width = 'Chiều rộng phải là số lớn hơn hoặc bằng 0';
      }
    }
    if (formData.height && formData.height !== '') {
      const height = parseFloat(formData.height);
      if (Number.isNaN(height) || height < 0) {
        errors.height = 'Chiều cao phải là số lớn hơn hoặc bằng 0';
      }
    }
    if (formData.weight && formData.weight !== '') {
      const weight = parseFloat(formData.weight);
      if (Number.isNaN(weight) || weight < 0) {
        errors.weight = STAFF_PRODUCT_ERRORS.weight;
      }
    }

    if (!formData.tax || formData.tax === '') {
      errors.tax = 'Vui lòng nhập phần trăm thuế';
    } else {
      const tax = parseFloat(formData.tax);
      if (Number.isNaN(tax) || tax < 0 || tax > 100) {
        errors.tax = 'Thuế phải là số từ 0 đến 100';
      }
    }

    if (formData.hasColorVariants) {
      const variantLabel = formData.variantLabel || 'Mã màu';
      if (!formData.colorVariants || formData.colorVariants.length === 0) {
        errors.colorVariants = `Vui lòng thêm ít nhất một ${variantLabel.toLowerCase()}.`;
      } else {
        // Kiểm tra mã màu không được trùng nhau trong cùng một sản phẩm
        const colorCodes = [];
        const duplicateCodes = [];

        for (let i = 0; i < formData.colorVariants.length; i += 1) {
          const variant = formData.colorVariants[i];
          const variantLabel = formData.variantLabel || 'Mã màu';
          const displayName = variant.name || variant.code || `${variantLabel} ${i + 1}`;

          if (!variant.name?.trim() && !variant.code?.trim()) {
            errors.colorVariants = `${variantLabel} thứ ${i + 1} cần tên hoặc mã.`;
            break;
          }

          // Kiểm tra mã màu trùng nhau
          if (variant.code?.trim()) {
            const codeLower = variant.code.trim().toLowerCase();
            if (colorCodes.includes(codeLower)) {
              if (!duplicateCodes.includes(codeLower)) {
                duplicateCodes.push(codeLower);
              }
            } else {
              colorCodes.push(codeLower);
            }
          }

          if (variant.stockQuantity === '' || variant.stockQuantity === undefined) {
            errors.colorVariants = `Vui lòng nhập tồn kho cho ${displayName}.`;
            break;
          }
          if (!/^\d+$/.test(String(variant.stockQuantity))) {
            errors.colorVariants = `Tồn kho của ${displayName} phải là số nguyên không âm.`;
            break;
          }
          
          // Nếu khác giá, kiểm tra giá và giá nhập
          if (formData.variantSamePrice === false) {
            // Giá niêm yết phải > 0
            if (!variant.price || parseFloat(variant.price) <= 0) {
              errors.colorVariants = `Vui lòng nhập giá niêm yết lớn hơn 0 cho ${displayName}.`;
              break;
            }
            // Giá nhập là optional, nhưng nếu có thì phải > 0 và không được lớn hơn giá niêm yết
            if (variant.purchasePrice) {
              const purchasePrice = parseFloat(variant.purchasePrice);
              if (purchasePrice <= 0) {
                errors.colorVariants = `Giá nhập của ${displayName} phải lớn hơn 0.`;
                break;
              }
              const unitPrice = parseFloat(variant.price);
              if (purchasePrice > unitPrice) {
                errors.colorVariants = `Giá nhập của ${displayName} không được lớn hơn giá niêm yết.`;
                break;
              }
            }
          }
          
          if (!variant.imageUrl && !variant.imageFile) {
            errors.colorVariants = `Vui lòng chọn ảnh cho ${displayName}.`;
            break;
          }
        }

        // Hiển thị lỗi nếu có mã màu trùng
        if (duplicateCodes.length > 0 && !errors.colorVariants) {
          const variantLabel = formData.variantLabel || 'Mã màu';
          errors.colorVariants = `${variantLabel} "${duplicateCodes.join('", "')}" bị trùng lặp. Vui lòng sử dụng mã khác.`;
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
        
        // Nếu cùng giá, xóa giá riêng và kích thước/trọng lượng riêng của từng variant (dùng chung của sản phẩm)
        if (formData.variantSamePrice !== false) {
          updatedVariants = updatedVariants.map(variant => ({
            ...variant,
            price: '',
            purchasePrice: '',
            length: '',
            width: '',
            height: '',
            weight: '',
          }));
        }
        
        setFormData((prev) => ({
          ...prev,
          colorVariants: updatedVariants,
        }));
      }
      const variantPayload = formData.hasColorVariants ? buildVariantPayload(updatedVariants) : [];
      const manufacturingLocation =
        formData.hasColorVariants && variantPayload.length > 0
          ? serializeVariantPayload(variantPayload, formData.variantLabel)
          : null;
      const stockQuantity =
        formData.hasColorVariants || !formData.stockQuantity
          ? null
          : parseInt(formData.stockQuantity, 10);

      // Xác định giá sản phẩm: nếu khác giá, lấy giá từ variant đầu tiên
      let productUnitPrice = 0;
      let productPurchasePrice = null;
      
      if (formData.hasColorVariants && formData.variantSamePrice === false) {
        // Khác giá: lấy giá từ variant đầu tiên (nếu có)
        if (updatedVariants.length > 0 && updatedVariants[0].price) {
          productUnitPrice = parseFloat(updatedVariants[0].price);
        }
        if (updatedVariants.length > 0 && updatedVariants[0].purchasePrice) {
          productPurchasePrice = parseFloat(updatedVariants[0].purchasePrice);
        }
      } else {
        // Cùng giá hoặc không có variants: dùng giá sản phẩm
        productUnitPrice = parseFloat(formData.price);
        productPurchasePrice = formData.purchasePrice ? parseFloat(formData.purchasePrice) : null;
      }

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
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        stockQuantity,
        manufacturingLocation,
        unitPrice: productUnitPrice,
        purchasePrice: productPurchasePrice,
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



  if (loading) {
    return (
      <div className={cx('wrapper')}>
        <div className={cx('loading')}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className={cx('wrapper')}>
      <div className={cx('header')}>
        <h2 className={cx('title')}>Quản lý sản phẩm</h2>
        <button 
          type="button" 
          className={cx('dashboardBtn')} 
          onClick={() => navigate('/staff')}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Dashboard
        </button>
      </div>

      <div className={cx('filterSection')}>
        <div className={cx('filterRow')}>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã sản phẩm, tên, danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cx('searchInput')}
          />
          <div className={cx('dateInputWrapper')}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={cx('dateInput')}
              placeholder="dd/mm/yyyy"
            />
            <FontAwesomeIcon icon={faCalendarAlt} className={cx('calendarIcon')} />
          </div>
          <button type="button" className={cx('searchBtn')} onClick={filterProducts}>
            <FontAwesomeIcon icon={faSearch} />
            Tìm kiếm
          </button>
        </div>
        <button type="button" className={cx('addBtn')} onClick={handleAdd}>
          <FontAwesomeIcon icon={faPlus} />
          Thêm sản phẩm
        </button>
      </div>

      <div className={cx('tableWrapper')}>
        <div className={cx('tableHeader')}>
          <h3 className={cx('tableTitle')}>Danh sách sản phẩm</h3>
        </div>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th>Ảnh</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Hàng tồn kho</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="6" className={cx('empty')}>
                  Không có sản phẩm nào
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className={cx('imageCell')}>
                    {product.defaultMediaUrl || (product.mediaUrls && product.mediaUrls.length > 0) ? (
                      <img 
                        src={product.defaultMediaUrl || product.mediaUrls[0]} 
                        alt={product.name}
                        className={cx('productImage')}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = fallbackImage;
                        }}
                      />
                    ) : (
                      <div className={cx('noImage')}></div>
                    )}
                  </td>
                  <td>
                    <div className={cx('productName')}>{product.name}</div>
                    <div className={cx('productCode')}>
                      Mã sản phẩm: <span>{product.id || '-'}</span>
                    </div>
                  </td>
                  <td>{product.categoryName || '-'}</td>
                  <td className={cx('priceCell')}>
                    {formatPrice(product.price)}
                  </td>
                  <td className={cx('stockCell')}>
                    {(() => {
                      // Nếu có color variants, hiển thị từng mã màu với tồn kho
                      if (product.manufacturingLocation) {
                        const variants = normalizeVariantRecords(product.manufacturingLocation);
                        if (variants.length > 0) {
                          const totalStock = variants.reduce((sum, variant) => {
                            const stock = variant.stockQuantity;
                            return sum + (stock !== null && stock !== undefined ? Number(stock) : 0);
                          }, 0);
                          
                          return (
                            <div className={cx('stockDisplay', 'variantStockDisplay')}>
                              <div className={cx('variantStockList')}>
                                {variants.map((variant, idx) => {
                                  const stock = variant.stockQuantity !== null && variant.stockQuantity !== undefined 
                                    ? Number(variant.stockQuantity) 
                                    : 0;
                                  const variantName = variant.name || variant.code || `Mã màu ${idx + 1}`;
                                  const variantCode = variant.code || '';
                                  const displayName = variantCode ? `${variantName} (${variantCode})` : variantName;
                                  const isOutOfStock = stock === 0;
                                  const isLowStock = stock > 0 && stock < 50;
                                  
                                  return (
                                    <div 
                                      key={idx} 
                                      className={cx('variantStockItem', { 
                                        lowStock: isLowStock, 
                                        outOfStock: isOutOfStock 
                                      })}
                                    >
                                      <span className={cx('variantStockLabel')}>{displayName}:</span>
                                      <span className={cx('variantStockValue')}>
                                        {stock.toLocaleString('vi-VN')}
                                      </span>
                                      {isOutOfStock && (
                                        <span className={cx('outOfStockBadge', 'small')} title="Mã màu đã hết hàng">
                                          Hết
                                        </span>
                                      )}
                                      {isLowStock && !isOutOfStock && (
                                        <span className={cx('lowStockBadge', 'small')} title="Mã màu sắp hết">
                                          Sắp hết
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <div className={cx('totalStockSummary')}>
                                <span className={cx('totalStockLabel')}>Tổng:</span>
                                <span className={cx('totalStockValue', {
                                  lowStock: totalStock > 0 && totalStock < 50,
                                  outOfStock: totalStock === 0
                                })}>
                                  {totalStock.toLocaleString('vi-VN')}
                                </span>
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      // Nếu không có variants, hiển thị tồn kho của product
                      const totalStock = product.stockQuantity !== null && product.stockQuantity !== undefined 
                        ? Number(product.stockQuantity) 
                        : 0;
                      const displayStock = totalStock > 0 ? totalStock.toLocaleString('vi-VN') : '0';
                      const isOutOfStock = totalStock === 0;
                      const isLowStock = totalStock > 0 && totalStock < 50;
                      
                      return (
                        <div className={cx('stockDisplay', { lowStock: isLowStock, outOfStock: isOutOfStock })}>
                          <span>{displayStock}</span>
                          {isOutOfStock && (
                            <span className={cx('outOfStockBadge')} title="Sản phẩm đã hết hàng">
                              Hết hàng
                            </span>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <span className={cx('lowStockBadge')} title="Sản phẩm sắp hết">
                              Sắp hết
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <div className={cx('actions')}>
                      <button
                        onClick={() => handleViewDetail(product)}
                        className={cx('actionBtn', 'viewBtn')}
                        title="Xem chi tiết"
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddProductPage
        open={isAddModalOpen}
        formData={formData}
        formErrors={formErrors}
        categories={categories}
        categoriesTree={categoriesTree}
        loadingCategories={loadingCategories}
        uploadingMedia={uploadingMedia}
        maxMediaItems={MAX_MEDIA_ITEMS}
        fileInputRef={fileInputRef}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onFormDataChange={handleFormDataChange}
        onMediaSelect={handleMediaSelect}
        onRemoveMedia={handleRemoveMedia}
        onSetDefaultMedia={handleSetDefaultMedia}
      onToggleColorVariants={handleToggleColorVariants}
      onAddVariant={handleAddVariant}
      onRemoveVariant={handleRemoveVariant}
      onVariantChange={handleVariantChange}
      onVariantStockChange={handleVariantStockChange}
      onVariantImageChange={handleVariantImageChange}
      onVariantPriceChange={handleVariantPriceChange}
        mediaFiles={mediaFiles}
      />
      <UpdateProductPage
        open={isEditModalOpen}
        formData={formData}
        formErrors={formErrors}
        categories={categories}
        categoriesTree={categoriesTree}
        loadingCategories={loadingCategories}
        uploadingMedia={uploadingMedia}
        maxMediaItems={MAX_MEDIA_ITEMS}
        fileInputRef={fileInputRef}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onFormDataChange={handleFormDataChange}
        onMediaSelect={handleMediaSelect}
        onRemoveMedia={handleRemoveMedia}
        onSetDefaultMedia={handleSetDefaultMedia}
      onToggleColorVariants={handleToggleColorVariants}
      onAddVariant={handleAddVariant}
      onRemoveVariant={handleRemoveVariant}
      onVariantChange={handleVariantChange}
      onVariantStockChange={handleVariantStockChange}
      onVariantImageChange={handleVariantImageChange}
      onVariantPriceChange={handleVariantPriceChange}
        mediaFiles={mediaFiles}
      />
      <ProductDetailPage
        open={Boolean(viewingProduct)}
        product={viewingProduct}
        formatPrice={formatPrice}
        onClose={handleCloseViewDetail}
        onEdit={(product) => {
          handleCloseViewDetail();
          handleEdit(product);
        }}
      />
    </div>
  );
}

export default StaffProducts;
