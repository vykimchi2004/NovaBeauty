import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faArrowLeft, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './StaffProducts.module.scss';
import AddProductPage from './AddProduct/AddProductPage';
import UpdateProductPage from './UpdateProduct/UpdateProductPage';
import ProductDetailPage from './ProductDetail/ProductDetailPage';
import { getMyProducts, createProduct, updateProduct, deleteProduct } from '~/services/product';
import { getCategories, getRootCategories, getSubCategories } from '~/services/category';
import { uploadProductMedia } from '~/services/media';
import notify from '~/utils/notification';
import fallbackImage from '~/assets/images/products/image1.jpg';
import { createStatusHelpers } from '~/utils/statusHelpers';
import { STAFF_PRODUCT_ERRORS, STAFF_PRODUCT_MESSAGES } from './messages';
const cx = classNames.bind(styles);
const MAX_MEDIA_ITEMS = 6;

const STATUS_CONFIG = {
  DA_DUYET: { label: 'Đã duyệt', class: 'approved' },
  CHO_DUYET: { label: 'Chờ duyệt', class: 'pending' },
  TU_CHOI: { label: 'Bị từ chối', class: 'rejected' }
};

const { normalizeStatus, getNormalizedProductStatus, formatStatusDisplay } = createStatusHelpers(STATUS_CONFIG);

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
  colorCodes: [], // Mã màu (array)
  ...overrides,
});

const buildExistingMediaFiles = (product) => {
  const urls = product?.mediaUrls || [];
  const defaultUrl = product?.defaultMediaUrl || urls[0] || '';
  return urls.map((url, index) => ({
    id: `existing-${index}`,
    file: null,
    type: 'IMAGE',
    preview: url,
    uploadedUrl: url,
    isDefault: defaultUrl ? url === defaultUrl : index === 0,
  }));
};

function StaffProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
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
    
    // Listen for category updates
    const handleCategoriesUpdated = () => {
      fetchCategories();
    };
    window.addEventListener('categoriesUpdated', handleCategoriesUpdated);
    
    return () => {
      window.removeEventListener('categoriesUpdated', handleCategoriesUpdated);
    };
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedDate, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getMyProducts();
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      notify.error('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const rootData = await getRootCategories();
      const activeRootCategories = (rootData || []).filter(cat => cat.status !== false);
      const allCategories = [...activeRootCategories];

      for (const rootCat of activeRootCategories) {
        try {
          const subCats = await getSubCategories(rootCat.id);
          const activeSubCats = (subCats || []).filter(cat => cat.status !== false);
          allCategories.push(...activeSubCats);
        } catch (subErr) {
          console.warn(`Error fetching subcategories for ${rootCat.id}:`, subErr);
        }
      }

      setCategories(allCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      try {
        const allData = await getCategories();
        const activeData = (allData || []).filter(cat => cat.status !== false);
        setCategories(activeData);
      } catch (fallbackErr) {
        console.error('Error fetching all categories:', fallbackErr);
        setCategories([]);
      }
    } finally {
      setLoadingCategories(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(term) ||
        product.id?.toLowerCase().includes(term) ||
        product.categoryName?.toLowerCase().includes(term)
      );
    }
    if (selectedDate) {
      const filterDate = new Date(selectedDate).toISOString().split('T')[0];
      filtered = filtered.filter(product => {
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
    resetFormState({
      publicationDate: new Date().toISOString().split('T')[0],
    }, []);
    setIsEditModalOpen(false);
    setIsAddModalOpen(true);
  };

  const handleEdit = (product) => {
    if (!product) return;
    setEditingProduct(product);
    const existingMedia = buildExistingMediaFiles(product);
    
    // Parse colorCodes từ manufacturingLocation (lưu dạng JSON)
    let colorCodes = [];
    if (product.manufacturingLocation) {
      try {
        colorCodes = JSON.parse(product.manufacturingLocation);
        if (!Array.isArray(colorCodes)) {
          colorCodes = [];
        }
      } catch (e) {
        // Nếu không phải JSON, thử parse như comma-separated
        if (product.manufacturingLocation.includes(',')) {
          colorCodes = product.manufacturingLocation.split(',').map(c => c.trim()).filter(c => c);
        } else if (product.manufacturingLocation.trim()) {
          colorCodes = [product.manufacturingLocation.trim()];
        }
      }
    }
    
    resetFormState({
      productId: product.id || '',
      name: product.name || '',
      description: product.description || '',
      size: product.size || '',
      brand: product.brand || '',
      brandOrigin: product.brandOrigin || '',
      texture: product.texture || '', // Kết cấu
      skinType: product.skinType || '', // Loại da
      reviewHighlights: product.characteristics || '', // Dùng trường characteristics cho review (ưu điểm)
      ingredients: product.ingredients || '',
      uses: product.uses || '',
      usageInstructions: product.usageInstructions || '',
      weight: product.weight?.toString() || '',
      price: product.price?.toString() || '',
      tax: product.tax?.toString() || '8', // Thuế cố định 8%
      publicationDate: product.publicationDate || new Date().toISOString().split('T')[0],
      categoryId: product.categoryId || product.category?.id || '',
      stockQuantity: product.stockQuantity?.toString() || '',
      colorCodes: colorCodes,
    }, existingMedia);
    setIsAddModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingProduct(null);
    resetFormState();
  };

  const handleMediaSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = MAX_MEDIA_ITEMS - mediaFiles.length;
    if (remainingSlots <= 0) {
      notify.warning(STAFF_PRODUCT_MESSAGES.mediaLimitReached(MAX_MEDIA_ITEMS));
      if (event.target) event.target.value = '';
      return;
    }

    const filesToUse = files.slice(0, remainingSlots);
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

  const handleAddColorCode = (colorCode) => {
    if (!colorCode || !colorCode.trim()) return;
    const trimmed = colorCode.trim();
    setFormData((prev) => {
      const colorCodes = prev.colorCodes || [];
      if (colorCodes.includes(trimmed)) {
        notify.warning('Mã màu này đã tồn tại');
        return prev;
      }
      return {
        ...prev,
        colorCodes: [...colorCodes, trimmed],
      };
    });
  };

  const handleRemoveColorCode = (index) => {
    setFormData((prev) => {
      const colorCodes = prev.colorCodes || [];
      return {
        ...prev,
        colorCodes: colorCodes.filter((_, i) => i !== index),
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
    if (!formData.description?.trim()) errors.description = STAFF_PRODUCT_ERRORS.descriptionShort;
    if (!formData.ingredients?.trim()) errors.ingredients = STAFF_PRODUCT_ERRORS.ingredients;
    if (!formData.uses?.trim()) errors.uses = STAFF_PRODUCT_ERRORS.uses;
    if (!formData.usageInstructions?.trim()) errors.usageInstructions = STAFF_PRODUCT_ERRORS.usageInstructions;
    const imageCount = mediaFiles.filter((item) => item.type !== 'VIDEO').length;
    if (imageCount === 0) {
      errors.mediaFiles = STAFF_PRODUCT_ERRORS.mediaRequired;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = STAFF_PRODUCT_ERRORS.price;
    }
    if (!formData.categoryId) errors.categoryId = STAFF_PRODUCT_ERRORS.category;
    
    // Validate numeric fields
    if (formData.weight && formData.weight !== '') {
      const weight = parseFloat(formData.weight);
      if (isNaN(weight) || weight < 0) {
        errors.weight = STAFF_PRODUCT_ERRORS.weight;
      }
    }
    
    if (formData.tax && formData.tax !== '') {
      const tax = parseFloat(formData.tax);
      if (isNaN(tax) || tax < 0) {
        errors.tax = STAFF_PRODUCT_ERRORS.tax;
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
      const defaultMedia =
        finalMediaList.find((item) => item.isDefault && item.uploadedUrl) ||
        finalMediaList.find((item) => item.uploadedUrl);

      // Lưu colorCodes vào manufacturingLocation dạng JSON
      const manufacturingLocation = formData.colorCodes && formData.colorCodes.length > 0
        ? JSON.stringify(formData.colorCodes)
        : null;

      const submitData = {
        id: formData.productId.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        size: formData.size?.trim() || null,
        brand: formData.brand?.trim() || null,
        brandOrigin: formData.brandOrigin?.trim() || null,
        texture: formData.texture?.trim() || null, // Kết cấu
        skinType: formData.skinType?.trim() || null, // Loại da
        characteristics: formData.reviewHighlights?.trim() || null, // Review (ưu điểm)
        ingredients: formData.ingredients?.trim() || null,
        uses: formData.uses?.trim() || null,
        usageInstructions: formData.usageInstructions?.trim() || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity, 10) : null,
        manufacturingLocation: manufacturingLocation, // Lưu mã màu dạng JSON
        // Tính unitPrice = giá niêm yết × 1.08 (thuế cố định 8%)
        unitPrice: parseFloat(formData.price) * 1.08,
        tax: 8.0, // Thuế cố định 8%
        publicationDate: formData.publicationDate || null,
        categoryId: formData.categoryId,
        imageUrls,
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
      // Xử lý lỗi permission cụ thể
      if (err.code === 403 || err.status === 403 || err.message?.includes('permission') || err.message?.includes('quyền')) {
        notify.error('Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại bằng tài khoản nhân viên.');
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
      STAFF_PRODUCT_MESSAGES.deleteConfirm.cancelText
    );
    
    if (!confirmed) return;

    try {
      await deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
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
    const statusInfo = STATUS_CONFIG[normalized] || {
      label: formatStatusDisplay(status),
      class: 'default'
    };
    return <span className={cx('statusBadge', statusInfo.class)}>{statusInfo.label}</span>;
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
              <th>Trạng thái</th>
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
                  <td>{getStatusBadge(product.status, product)}</td>
                  <td>
                    <div className={cx('actions')}>
                      <button
                        onClick={() => handleViewDetail(product)}
                        className={cx('actionBtn', 'viewBtn')}
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
        onAddColorCode={handleAddColorCode}
        onRemoveColorCode={handleRemoveColorCode}
        mediaFiles={mediaFiles}
      />
      <UpdateProductPage
        open={isEditModalOpen}
        formData={formData}
        formErrors={formErrors}
        categories={categories}
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
        onAddColorCode={handleAddColorCode}
        onRemoveColorCode={handleRemoveColorCode}
        mediaFiles={mediaFiles}
      />
      <ProductDetailPage
        open={Boolean(viewingProduct)}
        product={viewingProduct}
        formatPrice={formatPrice}
        getStatusBadge={(status) => getStatusBadge(status, viewingProduct)}
        getNormalizedStatus={getNormalizedProductStatus}
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
