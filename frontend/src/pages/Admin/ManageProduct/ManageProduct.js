import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faTrash,
  faEdit,
  faPlus,
  faEye,
  faEyeSlash,
  faTimes,
  faCheck,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageProduct.module.scss';
import { getProducts, deleteProduct, createProduct, updateProduct } from '~/services/product';
import { getCategories } from '~/services/category';
import { uploadProductMedia } from '~/services/media';
import notify from '~/utils/notification';
import fallbackImage from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);
const MAX_MEDIA_ITEMS = 6;

function ManageProduct() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    detailedDescription: '',
    size: '',
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
    defaultMediaUrl: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, filterStatus, products]);

  useEffect(() => {
    if (!showModal && fileInputRef.current) {
      fileInputRef.current.value = '';
      setUploadingMedia(false);
    }
  }, [showModal]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
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
      const data = await getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term) ||
        product.categoryName?.toLowerCase().includes(term) ||
        product.id?.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(product => {
        if (filterStatus === 'active') return product.status === 'ACTIVE';
        if (filterStatus === 'pending') return product.status === 'PENDING';
        if (filterStatus === 'rejected') return product.status === 'REJECTED';
        return true;
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
      defaultMediaUrl: ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      detailedDescription: product.detailedDescription || '',
      size: product.size || '',
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
      categoryId: product.categoryId || '',
      mediaUrls: product.mediaUrls || [],
      defaultMediaUrl: product.defaultMediaUrl || (product.mediaUrls && product.mediaUrls[0]) || ''
    });
    setFormErrors({});
    setShowModal(true);
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

  const validateForm = () => {
    const errors = {};
    
    // Kiểm tra rỗng và định dạng cơ bản
    if (!formData.name?.trim()) {
      errors.name = 'Tên sản phẩm không được để trống';
    } else if (formData.name.trim().length > 255) {
      errors.name = 'Tên sản phẩm không được vượt quá 255 ký tự';
    }
    
    if (!formData.price || formData.price === '') {
      errors.price = 'Giá sản phẩm không được để trống';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        errors.price = 'Giá sản phẩm phải là số và lớn hơn hoặc bằng 0';
      }
    }
    
    if (!formData.publicationDate) {
      errors.publicationDate = 'Ngày xuất bản không được để trống';
    }
    
    if (!formData.categoryId) {
      errors.categoryId = 'Danh mục không được để trống';
    }

    if (!formData.mediaUrls || formData.mediaUrls.length === 0) {
      errors.mediaUrls = 'Vui lòng tải lên ít nhất một ảnh sản phẩm';
    }
    
    // Kiểm tra các trường số khác
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
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        price: parseFloat(formData.price),
        tax: formData.tax ? parseFloat(formData.tax) : null,
        discountValue: formData.discountValue ? parseFloat(formData.discountValue) : null,
        publicationDate: formData.publicationDate,
        mediaUrls: formData.mediaUrls,
        defaultMediaUrl: formData.defaultMediaUrl || formData.mediaUrls[0] || null,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, submitData);
        notify.success('Cập nhật sản phẩm thành công!');
      } else {
        // Thêm sản phẩm mới - sẽ có status PENDING
        await createProduct(submitData);
        notify.success('Thêm sản phẩm thành công! Sản phẩm đang ở trạng thái "Chờ duyệt". Quản trị viên sẽ xem xét và duyệt sản phẩm của bạn.');
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      
      // Xử lý các lỗi cụ thể
      let errorMessage = 'Không thể lưu sản phẩm. Vui lòng thử lại.';
      
      if (err.message) {
        if (err.message.includes('Tên sản phẩm đã tồn tại') || err.message.includes('PRODUCT_NAME_EXISTED')) {
          errorMessage = 'Tên sản phẩm đã tồn tại. Vui lòng chọn tên khác.';
          setFormErrors({ ...formErrors, name: 'Tên sản phẩm đã tồn tại' });
        } else if (err.message.includes('Danh mục không tồn tại') || err.message.includes('CATEGORY_NOT_EXISTED')) {
          errorMessage = 'Danh mục không tồn tại. Vui lòng chọn danh mục khác.';
          setFormErrors({ ...formErrors, categoryId: 'Danh mục không tồn tại' });
        } else if (err.message.includes('Dữ liệu đầu vào không hợp lệ') || err.message.includes('INVALID_INPUT')) {
          errorMessage = 'Dữ liệu nhập vào không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.';
        } else if (err.message.includes('Lỗi hệ thống') || err.message.includes('INTERNAL_SERVER_ERROR')) {
          errorMessage = 'Lỗi hệ thống khi lưu sản phẩm. Vui lòng thử lại sau.';
        } else {
          errorMessage = err.message;
        }
      }
      
      notify.error(errorMessage);
    }
  };

  const handleViewDetail = (product) => {
    setViewingProduct(product);
  };

  const handleCloseViewDetail = () => {
    setViewingProduct(null);
  };

  const handleApproveClick = () => {
    setShowApproveConfirm(true);
  };

  const handleApproveConfirm = async () => {
    if (!viewingProduct) return;

    try {
      await updateProduct(viewingProduct.id, { status: 'APPROVED' });
      notify.success('Sản phẩm đã được duyệt thành công!');
      setShowApproveConfirm(false);
      setViewingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error('Error approving product:', err);
      notify.error('Không thể duyệt sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
    setRejectReason('');
  };

  const handleRejectSubmit = async () => {
    if (!viewingProduct) return;
    if (!rejectReason.trim()) {
      notify.warning('Vui lòng nhập lý do không duyệt.');
      return;
    }

    try {
      await updateProduct(viewingProduct.id, { 
        status: 'REJECTED',
        rejectionReason: rejectReason.trim()
      });
      notify.success('Sản phẩm không được duyệt. Lý do đã được lưu.');
      setShowRejectModal(false);
      setRejectReason('');
      setViewingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error('Error rejecting product:', err);
      notify.error('Không thể từ chối sản phẩm. Vui lòng thử lại.');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price || 0) + ' ₫';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      ACTIVE: { label: 'Hoạt động', class: 'active' },
      PENDING: { label: 'Chờ duyệt', class: 'pending' },
      REJECTED: { label: 'Từ chối', class: 'rejected' },
      APPROVED: { label: 'Đã duyệt', class: 'active' }
    };
    const statusInfo = statusMap[status] || { label: status, class: 'default' };
    return <span className={cx('statusBadge', statusInfo.class)}>{statusInfo.label}</span>;
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
        <div className={cx('headerActions')}>
          <div className={cx('searchBox')}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, thương hiệu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cx('searchInput')}
            />
            <button type="button" className={cx('searchBtn')}>
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </div>
          <div className={cx('sortGroup')}>
            <span className={cx('sortLabel')}>Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={cx('sortSelect')}
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="pending">Chờ duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        </div>
      </div>

      <div className={cx('tableWrapper')}>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Thương hiệu</th>
              <th>Giá</th>
              <th>Đã bán</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="8" className={cx('empty')}>
                  Không có sản phẩm nào
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className={cx('idCell')}>{product.id.substring(0, 8)}...</td>
                  <td className={cx('nameCell')}>{product.name}</td>
                  <td>{product.categoryName || '-'}</td>
                  <td>{product.brand || '-'}</td>
                  <td className={cx('priceCell')}>{formatPrice(product.price)}</td>
                  <td>{product.quantitySold || 0}</td>
                  <td>{getStatusBadge(product.status)}</td>
                  <td>
                    <div className={cx('actions')}>
                      {product.status === 'PENDING' && (
                        <button
                          type="button"
                          className={cx('actionBtn', 'viewBtn')}
                          onClick={() => handleViewDetail(product)}
                          title="Xem chi tiết"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={cx('actionBtn', 'editBtn')}
                        onClick={() => handleEdit(product)}
                        title="Sửa"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        type="button"
                        className={cx('actionBtn', 'deleteBtn')}
                        onClick={() => handleDelete(product.id)}
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

      {/* Modal Add/Edit Product */}
      {showModal && (
        <div className={cx('modalOverlay')} onClick={() => setShowModal(false)}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>{editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={cx('form')}>
              <div className={cx('formRow')}>
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
                    <option value="">Chọn danh mục</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {formErrors.categoryId && <span className={cx('errorText')}>{formErrors.categoryId}</span>}
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup', { error: formErrors.price })}>
                  <label>Giá *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                  />
                  {formErrors.price && <span className={cx('errorText')}>{formErrors.price}</span>}
                </div>

                <div className={cx('formGroup')}>
                  <label>Giảm giá</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup')}>
                  <label>Thương hiệu</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Nhập thương hiệu"
                  />
                </div>

                <div className={cx('formGroup', { error: formErrors.publicationDate })}>
                  <label>Ngày xuất bản *</label>
                  <input
                    type="date"
                    value={formData.publicationDate}
                    onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })}
                  />
                  {formErrors.publicationDate && <span className={cx('errorText')}>{formErrors.publicationDate}</span>}
                </div>
              </div>

              <div className={cx('formGroup')}>
                <label>Mô tả</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về sản phẩm"
                />
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
                    Có thể tải tối đa {MAX_MEDIA_ITEMS} ảnh. Ảnh đầu tiên sẽ là ảnh chính, bạn có thể thay đổi sau khi tải lên.
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

              <div className={cx('formGroup')}>
                <label>Mô tả chi tiết</label>
                <textarea
                  rows="5"
                  value={formData.detailedDescription}
                  onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
                  placeholder="Mô tả chi tiết về sản phẩm"
                />
              </div>

              <div className={cx('formGroup')}>
                <label>Thành phần</label>
                <textarea
                  rows="3"
                  value={formData.ingredients}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                  placeholder="Thành phần sản phẩm"
                />
              </div>

              <div className={cx('formGroup')}>
                <label>Công dụng</label>
                <textarea
                  rows="3"
                  value={formData.uses}
                  onChange={(e) => setFormData({ ...formData, uses: e.target.value })}
                  placeholder="Công dụng của sản phẩm"
                />
              </div>

              <div className={cx('formActions')}>
                <button type="button" className={cx('cancelBtn')} onClick={() => setShowModal(false)}>
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
          <div className={cx('modal', 'largeModal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>Chi tiết sản phẩm</h3>
              <button type="button" className={cx('closeBtn')} onClick={handleCloseViewDetail}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className={cx('form')}>
              <div className={cx('detailImage')}>
                {viewingProduct.defaultMediaUrl || (viewingProduct.mediaUrls && viewingProduct.mediaUrls.length > 0) ? (
                  <>
                    <img 
                      src={viewingProduct.defaultMediaUrl || viewingProduct.mediaUrls[0]} 
                      alt={viewingProduct.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = fallbackImage;
                      }}
                    />
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
                  </>
                ) : (
                  <div className={cx('mediaPlaceholder')}>Không có ảnh</div>
                )}
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup')}>
                  <label>ID Sản phẩm</label>
                  <input type="text" value={viewingProduct.id} readOnly />
                </div>
                <div className={cx('formGroup')}>
                  <label>Trạng thái</label>
                  <div>{getStatusBadge(viewingProduct.status)}</div>
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup')}>
                  <label>Tên sản phẩm</label>
                  <input type="text" value={viewingProduct.name || ''} readOnly />
                </div>
                <div className={cx('formGroup')}>
                  <label>Danh mục</label>
                  <input type="text" value={viewingProduct.categoryName || '-'} readOnly />
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup')}>
                  <label>Giá</label>
                  <input type="text" value={formatPrice(viewingProduct.price)} readOnly />
                </div>
                <div className={cx('formGroup')}>
                  <label>Giảm giá</label>
                  <input type="text" value={formatPrice(viewingProduct.discountValue || 0)} readOnly />
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup')}>
                  <label>Thương hiệu</label>
                  <input type="text" value={viewingProduct.brand || '-'} readOnly />
                </div>
                <div className={cx('formGroup')}>
                  <label>Ngày xuất bản</label>
                  <input type="text" value={viewingProduct.publicationDate || '-'} readOnly />
                </div>
              </div>

              <div className={cx('formGroup')}>
                <label>Mô tả</label>
                <textarea rows="3" value={viewingProduct.description || ''} readOnly />
              </div>

              <div className={cx('formGroup')}>
                <label>Mô tả chi tiết</label>
                <textarea rows="5" value={viewingProduct.detailedDescription || ''} readOnly />
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup')}>
                  <label>Thành phần</label>
                  <textarea rows="3" value={viewingProduct.ingredients || ''} readOnly />
                </div>
                <div className={cx('formGroup')}>
                  <label>Công dụng</label>
                  <textarea rows="3" value={viewingProduct.uses || ''} readOnly />
                </div>
              </div>

              {viewingProduct.status === 'PENDING' && (
                <div className={cx('formActions')}>
                  <button type="button" className={cx('cancelBtn')} onClick={handleCloseViewDetail}>
                    Đóng
                  </button>
                  <button type="button" className={cx('rejectBtn')} onClick={handleRejectClick}>
                    <FontAwesomeIcon icon={faXmark} />
                    Không duyệt
                  </button>
                  <button type="button" className={cx('approveBtn')} onClick={handleApproveClick}>
                    <FontAwesomeIcon icon={faCheck} />
                    Duyệt
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Duyệt */}
      {showApproveConfirm && (
        <div className={cx('modalOverlay')} onClick={() => setShowApproveConfirm(false)}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>Xác nhận duyệt sản phẩm</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowApproveConfirm(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className={cx('form')}>
              <p>Bạn có chắc chắn muốn duyệt sản phẩm này không?</p>
              <div className={cx('formActions')}>
                <button type="button" className={cx('cancelBtn')} onClick={() => setShowApproveConfirm(false)}>
                  Hủy
                </button>
                <button type="button" className={cx('approveBtn')} onClick={handleApproveConfirm}>
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Lý Do Từ Chối */}
      {showRejectModal && (
        <div className={cx('modalOverlay')} onClick={() => setShowRejectModal(false)}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>Nhập lý do không duyệt</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowRejectModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className={cx('form')}>
              <div className={cx('formGroup')}>
                <label>Lý do không duyệt *</label>
                <textarea
                  rows="4"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do không duyệt sản phẩm..."
                />
              </div>
              <div className={cx('formActions')}>
                <button type="button" className={cx('cancelBtn')} onClick={() => setShowRejectModal(false)}>
                  Hủy
                </button>
                <button type="button" className={cx('rejectBtn')} onClick={handleRejectSubmit}>
                  Gửi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageProduct;
