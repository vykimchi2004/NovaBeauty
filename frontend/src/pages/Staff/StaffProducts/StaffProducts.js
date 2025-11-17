import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faSearch, faTimes, faArrowLeft, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './StaffProducts.module.scss';
import { getMyProducts, createProduct, updateProduct, deleteProduct } from '~/services/product';
import { getCategories, getRootCategories, getSubCategories } from '~/services/category';
import { uploadProductMedia } from '~/services/media';
import notify from '~/utils/notification';
import fallbackImage from '~/assets/images/products/image1.jpg';
const cx = classNames.bind(styles);
const MAX_MEDIA_ITEMS = 6;

function StaffProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    detailedDescription: '',
    size: '',
    author: '',
    publisher: '',
    brand: '',
    brandOrigin: '',
    manufacturingLocation: '',
    characteristics: '',
    ingredients: '',
    uses: '',
    usageInstructions: '',
    weight: '',
    price: '',
    tax: '',
    discountValue: '',
    publicationDate: '',
    categoryId: '',
    mediaUrls: [],
    defaultMediaUrl: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef(null);

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

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      detailedDescription: '',
      size: '',
      author: '',
      publisher: '',
      brand: '',
      brandOrigin: '',
      manufacturingLocation: '',
      characteristics: '',
      ingredients: '',
      uses: '',
      usageInstructions: '',
      weight: '',
      price: '',
      tax: '',
      discountValue: '',
      publicationDate: new Date().toISOString().split('T')[0],
      categoryId: '',
      mediaUrls: [],
      defaultMediaUrl: '',
    });
    setFormErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadingMedia(false);
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      detailedDescription: product.detailedDescription || '',
      size: product.size || '',
      author: product.author || '',
      publisher: product.publisher || '',
      brand: product.brand || '',
      brandOrigin: product.brandOrigin || '',
      manufacturingLocation: product.manufacturingLocation || '',
      characteristics: product.characteristics || '',
      ingredients: product.ingredients || '',
      uses: product.uses || '',
      usageInstructions: product.usageInstructions || '',
      weight: product.weight?.toString() || '',
      price: product.price?.toString() || '',
      tax: product.tax?.toString() || '',
      discountValue: product.discountValue?.toString() || '',
      publicationDate: product.publicationDate || new Date().toISOString().split('T')[0],
      categoryId: product.categoryId || product.category?.id || '',
      mediaUrls: product.mediaUrls || [],
      defaultMediaUrl: product.defaultMediaUrl || (product.mediaUrls && product.mediaUrls[0]) || '',
    });
    setFormErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadingMedia(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      detailedDescription: '',
      size: '',
      author: '',
      publisher: '',
      brand: '',
      brandOrigin: '',
      manufacturingLocation: '',
      characteristics: '',
      ingredients: '',
      uses: '',
      usageInstructions: '',
      weight: '',
      price: '',
      tax: '',
      discountValue: '',
      publicationDate: '',
      categoryId: '',
      mediaUrls: [],
      defaultMediaUrl: '',
    });
    setFormErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadingMedia(false);
  };

  const handleMediaSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = MAX_MEDIA_ITEMS - (formData.mediaUrls?.length || 0);
    if (remainingSlots <= 0) {
      notify.warning(`Bạn chỉ có thể tải tối đa ${MAX_MEDIA_ITEMS} ảnh cho mỗi sản phẩm.`);
      event.target.value = '';
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);

    try {
      setUploadingMedia(true);
      const uploadedUrls = await uploadProductMedia(filesToUpload);
      if (!uploadedUrls || uploadedUrls.length === 0) {
        notify.error('Không thể tải ảnh lên. Vui lòng thử lại.');
        return;
      }

      setFormData((prev) => {
        const nextUrls = [...(prev.mediaUrls || []), ...uploadedUrls];
        return {
          ...prev,
          mediaUrls: nextUrls,
          defaultMediaUrl: prev.defaultMediaUrl || nextUrls[0] || '',
        };
      });

      setFormErrors((prev) => {
        if (!prev.mediaUrls) return prev;
        const next = { ...prev };
        delete next.mediaUrls;
        return next;
      });

      notify.success('Tải ảnh thành công!');
    } catch (error) {
      console.error('Error uploading product media:', error);
      notify.error(error.message || 'Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploadingMedia(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveMedia = (index) => {
    setFormData((prev) => {
      const nextUrls = [...(prev.mediaUrls || [])];
      const [removed] = nextUrls.splice(index, 1);
      const nextDefault =
        removed && removed === prev.defaultMediaUrl ? (nextUrls[0] || '') : prev.defaultMediaUrl;

      return {
        ...prev,
        mediaUrls: nextUrls,
        defaultMediaUrl: nextDefault || '',
      };
    });
  };

  const handleSetDefaultMedia = (url) => {
    setFormData((prev) => ({
      ...prev,
      defaultMediaUrl: url,
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Tên sản phẩm không được để trống';
    if (!formData.brand?.trim()) errors.brand = 'Thương hiệu không được để trống';
    if (!formData.manufacturingLocation?.trim()) {
      errors.manufacturingLocation = 'Nơi sản xuất không được để trống';
    }
    if (!formData.description?.trim()) {
      errors.description = 'Mô tả ngắn hiển thị trên trang chi tiết không được để trống';
    }
    if (!formData.detailedDescription?.trim()) {
      errors.detailedDescription = 'Mô tả chi tiết không được để trống';
    }
    if (!formData.ingredients?.trim()) {
      errors.ingredients = 'Vui lòng nhập thành phần sản phẩm (mỗi dòng một thành phần)';
    }
    if (!formData.uses?.trim()) {
      errors.uses = 'Vui lòng nhập công dụng sản phẩm';
    }
    if (!formData.usageInstructions?.trim()) {
      errors.usageInstructions = 'Vui lòng nhập hướng dẫn sử dụng';
    }
    if (!formData.characteristics?.trim()) {
      errors.characteristics = 'Vui lòng nhập đặc điểm nổi bật';
    }
    if (!formData.mediaUrls || formData.mediaUrls.length === 0) {
      errors.mediaUrls = 'Vui lòng tải lên ít nhất một ảnh sản phẩm';
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = 'Giá sản phẩm phải lớn hơn 0';
    }
    if (!formData.categoryId) errors.categoryId = 'Vui lòng chọn danh mục';
    
    // Validate numeric fields
    if (formData.weight && formData.weight !== '') {
      const weight = parseFloat(formData.weight);
      if (isNaN(weight) || weight < 0) {
        errors.weight = 'Trọng lượng phải là số và lớn hơn hoặc bằng 0';
      }
    }
    
    if (formData.tax && formData.tax !== '') {
      const tax = parseFloat(formData.tax);
      if (isNaN(tax) || tax < 0) {
        errors.tax = 'Thuế phải là số và lớn hơn hoặc bằng 0';
      }
    }
    
    if (formData.discountValue && formData.discountValue !== '') {
      const discount = parseFloat(formData.discountValue);
      if (isNaN(discount) || discount < 0) {
        errors.discountValue = 'Giá trị giảm giá phải là số và lớn hơn hoặc bằng 0';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        detailedDescription: formData.detailedDescription?.trim() || null,
        size: formData.size?.trim() || null,
        author: formData.author?.trim() || null,
        publisher: formData.publisher?.trim() || null,
        brand: formData.brand?.trim() || null,
        brandOrigin: formData.brandOrigin?.trim() || null,
        manufacturingLocation: formData.manufacturingLocation?.trim() || null,
        characteristics: formData.characteristics?.trim() || null,
        ingredients: formData.ingredients?.trim() || null,
        uses: formData.uses?.trim() || null,
        usageInstructions: formData.usageInstructions?.trim() || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        price: parseFloat(formData.price),
        tax: formData.tax ? parseFloat(formData.tax) : null,
        discountValue: formData.discountValue ? parseFloat(formData.discountValue) : null,
        publicationDate: formData.publicationDate || null,
        categoryId: formData.categoryId,
        mediaUrls: formData.mediaUrls,
        defaultMediaUrl: formData.defaultMediaUrl || formData.mediaUrls[0] || null,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, submitData);
        notify.success('Cập nhật sản phẩm thành công!');
      } else {
        await createProduct(submitData);
        notify.success('Thêm sản phẩm thành công!');
      }

      handleCloseModal();
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      notify.error(err.message || 'Không thể lưu sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (productId) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc chắn muốn xóa sản phẩm này?',
      'Xác nhận xóa sản phẩm',
      'Xóa',
      'Hủy'
    );
    
    if (!confirmed) return;

    try {
      await deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
      notify.success('Xóa sản phẩm thành công!');
    } catch (err) {
      console.error('Error deleting product:', err);
      notify.error('Không thể xóa sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleViewDetail = (product) => {
    setViewingProduct(product);
  };

  const handleCloseViewDetail = () => {
    setViewingProduct(null);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price || 0) + ' ₫';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      ACTIVE: { label: 'Đã duyệt', class: 'approved' },
      PENDING: { label: 'Chờ duyệt', class: 'pending' },
      REJECTED: { label: 'Không được duyệt', class: 'rejected' },
      APPROVED: { label: 'Đã duyệt', class: 'approved' }
    };
    const statusInfo = statusMap[status] || { label: status, class: 'default' };
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
            placeholder="Tìm kiếm theo mã voucher, tên khuyến mãi......."
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
                  </td>
                  <td>{product.categoryName || '-'}</td>
                  <td className={cx('priceCell')}>
                    {formatPrice(product.price)}
                  </td>
                  <td>
                    {getStatusBadge(product.status)}
                  </td>
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

      {/* Modal Add/Edit Product */}
      {showModal && (
        <div className={cx('modalOverlay')} onClick={handleCloseModal}>
          <div className={cx('modalContent')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>{editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <button className={cx('closeBtn')} onClick={handleCloseModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className={cx('modalBody')}>
              <div className={cx('formGroup', { error: formErrors.name })}>
                <label>Tên sản phẩm *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên sản phẩm"
                />
                {formErrors.name && <span className={cx('errorText')}>{formErrors.name}</span>}
              </div>

              <div className={cx('formGroup', { error: formErrors.categoryId })}>
                <label>Danh mục *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">{loadingCategories ? 'Đang tải danh mục...' : 'Chọn danh mục'}</option>
                  {categories.length === 0 && !loadingCategories && (
                    <option value="" disabled>Không có danh mục nào</option>
                  )}
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {formErrors.categoryId && <span className={cx('errorText')}>{formErrors.categoryId}</span>}
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup', { error: formErrors.brand })}>
                  <label>Thương hiệu</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Nhập thương hiệu"
                  />
                  {formErrors.brand && <span className={cx('errorText')}>{formErrors.brand}</span>}
                </div>

                <div className={cx('formGroup')}>
                  <label>Xuất xứ thương hiệu</label>
                  <input
                    type="text"
                    value={formData.brandOrigin}
                    onChange={(e) => setFormData({ ...formData, brandOrigin: e.target.value })}
                    placeholder="Nhập xuất xứ thương hiệu"
                  />
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup', { error: formErrors.price })}>
                  <label>Giá sản phẩm *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Nhập giá sản phẩm"
                  />
                  {formErrors.price && <span className={cx('errorText')}>{formErrors.price}</span>}
                </div>

                <div className={cx('formGroup', { error: formErrors.discountValue })}>
                  <label>Giảm giá</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder="Nhập giá trị giảm giá"
                  />
                  {formErrors.discountValue && <span className={cx('errorText')}>{formErrors.discountValue}</span>}
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup')}>
                  <label>Kích thước</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="Nhập kích thước"
                  />
                </div>

                <div className={cx('formGroup', { error: formErrors.manufacturingLocation })}>
                  <label>Nơi sản xuất</label>
                  <input
                    type="text"
                    value={formData.manufacturingLocation}
                    onChange={(e) => setFormData({ ...formData, manufacturingLocation: e.target.value })}
                    placeholder="Nhập nơi sản xuất"
                  />
                  {formErrors.manufacturingLocation && (
                    <span className={cx('errorText')}>{formErrors.manufacturingLocation}</span>
                  )}
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup', { error: formErrors.weight })}>
                  <label>Trọng lượng (gram)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="Nhập trọng lượng"
                  />
                  {formErrors.weight && <span className={cx('errorText')}>{formErrors.weight}</span>}
                </div>

                <div className={cx('formGroup', { error: formErrors.tax })}>
                  <label>Thuế</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    placeholder="Nhập thuế"
                  />
                  {formErrors.tax && <span className={cx('errorText')}>{formErrors.tax}</span>}
                </div>
              </div>

              <div className={cx('formGroup', { error: formErrors.mediaUrls })}>
                <label>Ảnh sản phẩm *</label>
                <div className={cx('mediaUploadRow')}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleMediaSelect}
                    disabled={uploadingMedia || (formData.mediaUrls?.length || 0) >= MAX_MEDIA_ITEMS}
                    className={cx('mediaFileInput')}
                  />
                  <small>
                    Bạn có thể tải tối đa {MAX_MEDIA_ITEMS} ảnh. Ảnh đầu tiên sẽ được chọn làm ảnh chính, bạn có thể thay đổi sau khi tải lên.
                  </small>
                </div>
                {uploadingMedia && <span className={cx('uploadingText')}>Đang tải ảnh...</span>}
                {formErrors.mediaUrls && <span className={cx('errorText')}>{formErrors.mediaUrls}</span>}

                <div className={cx('mediaPreviewGrid')}>
                  {(formData.mediaUrls || []).map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className={cx('mediaPreviewItem', {
                        active: formData.defaultMediaUrl === url,
                      })}
                    >
                      <img src={url} alt={`Ảnh sản phẩm ${index + 1}`} />
                      <div className={cx('mediaPreviewActions')}>
                        <button
                          type="button"
                          className={cx('mediaActionBtn')}
                          onClick={() => handleSetDefaultMedia(url)}
                          disabled={formData.defaultMediaUrl === url}
                        >
                          {formData.defaultMediaUrl === url ? 'Ảnh chính' : 'Đặt làm ảnh chính'}
                        </button>
                        <button
                          type="button"
                          className={cx('mediaActionBtn', 'danger')}
                          onClick={() => handleRemoveMedia(index)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!formData.mediaUrls || formData.mediaUrls.length === 0) && (
                    <div className={cx('mediaPlaceholder')}>
                      <span>Chưa có ảnh nào. Vui lòng tải ảnh sản phẩm.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={cx('formGroup', { error: formErrors.description })}>
                <label>Mô tả</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về sản phẩm"
                />
                {formErrors.description && <span className={cx('errorText')}>{formErrors.description}</span>}
              </div>

              <div className={cx('formGroup', { error: formErrors.detailedDescription })}>
                <label>Mô tả chi tiết</label>
                <textarea
                  rows="4"
                  value={formData.detailedDescription}
                  onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
                  placeholder="Mô tả chi tiết về sản phẩm"
                />
                {formErrors.detailedDescription && (
                  <span className={cx('errorText')}>{formErrors.detailedDescription}</span>
                )}
              </div>

              <div className={cx('formGroup', { error: formErrors.characteristics })}>
                <label>Đặc điểm</label>
                <textarea
                  rows="3"
                  value={formData.characteristics}
                  onChange={(e) => setFormData({ ...formData, characteristics: e.target.value })}
                  placeholder="Đặc điểm của sản phẩm"
                />
                {formErrors.characteristics && <span className={cx('errorText')}>{formErrors.characteristics}</span>}
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup', { error: formErrors.ingredients })}>
                  <label>Thành phần</label>
                  <textarea
                    rows="3"
                    value={formData.ingredients}
                    onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                    placeholder="Danh sách thành phần"
                  />
                  {formErrors.ingredients && <span className={cx('errorText')}>{formErrors.ingredients}</span>}
                </div>

                <div className={cx('formGroup', { error: formErrors.uses })}>
                  <label>Công dụng</label>
                  <textarea
                    rows="3"
                    value={formData.uses}
                    onChange={(e) => setFormData({ ...formData, uses: e.target.value })}
                    placeholder="Công dụng của sản phẩm"
                  />
                  {formErrors.uses && <span className={cx('errorText')}>{formErrors.uses}</span>}
                </div>
              </div>

              <div className={cx('formGroup', { error: formErrors.usageInstructions })}>
                <label>Cách sử dụng</label>
                <textarea
                  rows="3"
                  value={formData.usageInstructions}
                  onChange={(e) => setFormData({ ...formData, usageInstructions: e.target.value })}
                  placeholder="Hướng dẫn sử dụng"
                />
                {formErrors.usageInstructions && (
                  <span className={cx('errorText')}>{formErrors.usageInstructions}</span>
                )}
              </div>

              <div className={cx('modalFooter')}>
                <button type="button" className={cx('cancelBtn')} onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className={cx('submitBtn')}>
                  {editingProduct ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Chi Tiết Sản Phẩm */}
      {viewingProduct && (
        <div className={cx('modalOverlay')} onClick={handleCloseViewDetail}>
          <div className={cx('modalContent', 'detailModal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>Chi tiết sản phẩm</h3>
              <button className={cx('closeBtn')} onClick={handleCloseViewDetail}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className={cx('modalBody')}>
              <div className={cx('detailGrid')}>
                <div className={cx('detailImage')}>
                    {viewingProduct.defaultMediaUrl || (viewingProduct.mediaUrls && viewingProduct.mediaUrls.length > 0) ? (
                      <img 
                        src={viewingProduct.defaultMediaUrl || viewingProduct.mediaUrls[0]} 
                        alt={viewingProduct.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = fallbackImage;
                        }}
                      />
                    ) : (
                      <div className={cx('noImageLarge')}>Không có ảnh</div>
                    )}
                  {viewingProduct.mediaUrls && viewingProduct.mediaUrls.length > 1 && (
                    <div className={cx('detailThumbList')}>
                      {viewingProduct.mediaUrls.map((url, index) => (
                        <img
                          key={`${url}-${index}`}
                          src={url}
                          alt={`${viewingProduct.name} ${index + 1}`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className={cx('detailInfo')}>
                  <div className={cx('detailRow')}>
                    <label>ID Sản phẩm:</label>
                    <span>{viewingProduct.id}</span>
                  </div>
                  <div className={cx('detailRow')}>
                    <label>Tên sản phẩm:</label>
                    <span>{viewingProduct.name}</span>
                  </div>
                  <div className={cx('detailRow')}>
                    <label>Danh mục:</label>
                    <span>{viewingProduct.categoryName || '-'}</span>
                  </div>
                  <div className={cx('detailRow')}>
                    <label>Trạng thái:</label>
                    <span>{getStatusBadge(viewingProduct.status)}</span>
                  </div>
                  
                  <div className={cx('detailRow')}>
                    <label>Thương hiệu:</label>
                    <span>{viewingProduct.brand || '-'}</span>
                  </div>
                  <div className={cx('detailRow')}>
                    <label>Xuất xứ thương hiệu:</label>
                    <span>{viewingProduct.brandOrigin || '-'}</span>
                  </div>
                  
                  <div className={cx('detailRow')}>
                    <label>Nơi sản xuất:</label>
                    <span>{viewingProduct.manufacturingLocation || '-'}</span>
                  </div>
                  <div className={cx('detailRow')}>
                    <label>Kích thước:</label>
                    <span>{viewingProduct.size || '-'}</span>
                  </div>
                  
                  <div className={cx('detailRow')}>
                    <label>Giá:</label>
                    <span className={cx('price')}>{formatPrice(viewingProduct.price)}</span>
                  </div>
                  <div className={cx('detailRow')}>
                    <label>Giảm giá:</label>
                    <span>{viewingProduct.discountValue ? formatPrice(viewingProduct.discountValue) : '-'}</span>
                  </div>
                  
                  <div className={cx('detailRow')}>
                    <label>Thuế:</label>
                    <span>{viewingProduct.tax ? formatPrice(viewingProduct.tax) : '-'}</span>
                  </div>
                  <div className={cx('detailRow')}>
                    <label>Trọng lượng:</label>
                    <span>{viewingProduct.weight ? `${viewingProduct.weight} gram` : '-'}</span>
                  </div>
                
                  <div className={cx('detailRow')}>
                    <label>Số lượng đã bán:</label>
                    <span>{viewingProduct.quantitySold || 0}</span>
                  </div>
                  
                  {viewingProduct.description && (
                    <div className={cx('detailRow', 'fullWidth')}>
                      <label>Mô tả:</label>
                      <p>{viewingProduct.description}</p>
                    </div>
                  )}
                  
                  {viewingProduct.detailedDescription && (
                    <div className={cx('detailRow', 'fullWidth')}>
                      <label>Mô tả chi tiết:</label>
                      <p>{viewingProduct.detailedDescription}</p>
                    </div>
                  )}
                  
                  {viewingProduct.characteristics && (
                    <div className={cx('detailRow', 'fullWidth')}>
                      <label>Đặc điểm:</label>
                      <p>{viewingProduct.characteristics}</p>
                    </div>
                  )}
                  
                  {viewingProduct.ingredients && (
                    <div className={cx('detailRow', 'fullWidth')}>
                      <label>Thành phần:</label>
                      <p>{viewingProduct.ingredients}</p>
                    </div>
                  )}
                  
                  {viewingProduct.uses && (
                    <div className={cx('detailRow', 'fullWidth')}>
                      <label>Công dụng:</label>
                      <p>{viewingProduct.uses}</p>
                    </div>
                  )}
                  
                  {viewingProduct.usageInstructions && (
                    <div className={cx('detailRow', 'fullWidth')}>
                      <label>Cách sử dụng:</label>
                      <p>{viewingProduct.usageInstructions}</p>
                    </div>
                  )}
                  
                  {viewingProduct.rejectionReason && (
                    <div className={cx('detailRow', 'fullWidth')}>
                      <label>Lý do từ chối:</label>
                      <p className={cx('rejectionReason')}>{viewingProduct.rejectionReason}</p>
                    </div>
                  )}
                  
                  {viewingProduct.approvedAt && (
                    <div className={cx('detailRow')}>
                      <label>Ngày duyệt:</label>
                      <span>{new Date(viewingProduct.approvedAt).toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                  
                  {viewingProduct.approvedByName && (
                    <div className={cx('detailRow')}>
                      <label>Người duyệt:</label>
                      <span>{viewingProduct.approvedByName}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className={cx('modalFooter')}>
                <button type="button" className={cx('cancelBtn')} onClick={handleCloseViewDetail}>
                  Đóng
                </button>
                {viewingProduct.status !== 'ACTIVE' && (
                  <button
                    type="button"
                    className={cx('editBtn')}
                    onClick={() => {
                      handleCloseViewDetail();
                      handleEdit(viewingProduct);
                    }}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                    Sửa sản phẩm
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffProducts;
