import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faTrash,
  faEdit,
  faPlus,
  faCheck,
  faTimes,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageVouchersPromotions.module.scss';
import notify from '~/utils/notification';
import {
  getPromotions,
  getPendingPromotions,
  getPromotionsByStatus,
  deletePromotion,
  createPromotion,
  updatePromotion,
  approvePromotion
} from '~/services/promotion';
import { getCategories } from '~/services/category';
import { getProducts } from '~/services/product';

const cx = classNames.bind(styles);

function ManageVouchersPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [filteredPromotions, setFilteredPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    imageUrl: '',
    description: '',
    discountValue: '',
    minOrderValue: '',
    maxDiscountValue: '',
    startDate: '',
    expiryDate: '',
    usageLimit: '',
    categoryIds: [],
    productIds: []
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchPromotions();
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    filterPromotions();
  }, [searchTerm, filterStatus, promotions]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const data = await getPromotions();
      setPromotions(data || []);
      setFilteredPromotions(data || []);
    } catch (err) {
      console.error('Error fetching promotions:', err);
      notify.error('Không thể tải danh sách khuyến mãi. Vui lòng thử lại.');
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

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const filterPromotions = () => {
    let filtered = [...promotions];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(promo =>
        promo.name?.toLowerCase().includes(term) ||
        promo.code?.toLowerCase().includes(term) ||
        promo.id?.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(promo => {
        const status = promo.status?.toLowerCase() || '';
        return status === filterStatus.toLowerCase();
      });
    }

    setFilteredPromotions(filtered);
  };

  const handleAdd = () => {
    setEditingPromotion(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData({
      name: '',
      code: '',
      imageUrl: '',
      description: '',
      discountValue: '',
      minOrderValue: '',
      maxDiscountValue: '',
      startDate: tomorrow.toISOString().split('T')[0],
      expiryDate: '',
      usageLimit: '',
      categoryIds: [],
      productIds: []
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name || '',
      code: promotion.code || '',
      imageUrl: promotion.imageUrl || '',
      description: promotion.description || '',
      discountValue: promotion.discountValue?.toString() || '',
      minOrderValue: promotion.minOrderValue?.toString() || '',
      maxDiscountValue: promotion.maxDiscountValue?.toString() || '',
      startDate: promotion.startDate || '',
      expiryDate: promotion.expiryDate || '',
      usageLimit: promotion.usageLimit?.toString() || '',
      categoryIds: Array.isArray(promotion.categoryIds) ? [...promotion.categoryIds] : [],
      productIds: Array.isArray(promotion.productIds) ? [...promotion.productIds] : []
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async (promotionId) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc chắn muốn xóa khuyến mãi này?',
      'Xác nhận xóa khuyến mãi',
      'Xóa',
      'Hủy'
    );
    
    if (!confirmed) return;

    try {
      await deletePromotion(promotionId);
      setPromotions(promotions.filter(p => p.id !== promotionId));
      notify.success('Xóa khuyến mãi thành công!');
    } catch (err) {
      console.error('Error deleting promotion:', err);
      notify.error('Không thể xóa khuyến mãi. Vui lòng thử lại.');
    }
  };

  const handleApprove = async (promotionId) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc muốn duyệt khuyến mãi này?',
      'Xác nhận duyệt khuyến mãi',
      'Duyệt',
      'Hủy'
    );
    
    if (!confirmed) return;

    try {
      await approvePromotion({ promotionId });
      notify.success('Đã duyệt khuyến mãi thành công!');
      fetchPromotions();
    } catch (err) {
      console.error('Error approving promotion:', err);
      notify.error('Không thể duyệt khuyến mãi. Vui lòng thử lại.');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Tên khuyến mãi không được để trống';
    if (!formData.code?.trim()) errors.code = 'Mã khuyến mãi không được để trống';
    if (!formData.discountValue || parseFloat(formData.discountValue) < 0) {
      errors.discountValue = 'Giá trị giảm giá không hợp lệ';
    }
    if (!formData.startDate) errors.startDate = 'Ngày bắt đầu không được để trống';
    if (!formData.expiryDate) errors.expiryDate = 'Ngày kết thúc không được để trống';
    if (!formData.usageLimit || parseInt(formData.usageLimit) < 1) {
      errors.usageLimit = 'Giới hạn sử dụng phải lớn hơn 0';
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
        code: formData.code.trim().toUpperCase(),
        imageUrl: formData.imageUrl?.trim() || null,
        description: formData.description?.trim() || null,
        discountValue: parseFloat(formData.discountValue),
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : null,
        maxDiscountValue: formData.maxDiscountValue ? parseFloat(formData.maxDiscountValue) : null,
        startDate: formData.startDate,
        expiryDate: formData.expiryDate,
        usageLimit: parseInt(formData.usageLimit),
        categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds : null,
        productIds: formData.productIds.length > 0 ? formData.productIds : null
      };

      if (editingPromotion) {
        await updatePromotion(editingPromotion.id, submitData);
        notify.success('Cập nhật khuyến mãi thành công!');
      } else {
        await createPromotion(submitData);
        notify.success('Thêm khuyến mãi thành công!');
      }

      setShowModal(false);
      fetchPromotions();
    } catch (err) {
      console.error('Error saving promotion:', err);
      notify.error(err.message || 'Không thể lưu khuyến mãi. Vui lòng thử lại.');
    }
  };

  const toggleCategory = (categoryId) => {
    const newCategoryIds = formData.categoryIds.includes(categoryId)
      ? formData.categoryIds.filter(id => id !== categoryId)
      : [...formData.categoryIds, categoryId];
    setFormData({ ...formData, categoryIds: newCategoryIds });
  };

  const toggleProduct = (productId) => {
    const newProductIds = formData.productIds.includes(productId)
      ? formData.productIds.filter(id => id !== productId)
      : [...formData.productIds, productId];
    setFormData({ ...formData, productIds: newProductIds });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { label: 'Chờ duyệt', class: 'pending' },
      APPROVED: { label: 'Đã duyệt', class: 'approved' },
      REJECTED: { label: 'Từ chối', class: 'rejected' },
      EXPIRED: { label: 'Hết hạn', class: 'expired' }
    };
    const statusInfo = statusMap[status] || { label: status, class: 'default' };
    return <span className={cx('statusBadge', statusInfo.class)}>{statusInfo.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
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
        <h2 className={cx('title')}>Voucher & Khuyến mãi</h2>
        <div className={cx('headerActions')}>
          <div className={cx('searchBox')}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã..."
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
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
              <option value="expired">Hết hạn</option>
            </select>
          </div>
        </div>
      </div>

      <div className={cx('tableWrapper')}>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên khuyến mãi</th>
              <th>Giảm giá</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
              <th>Đã dùng</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredPromotions.length === 0 ? (
              <tr>
                <td colSpan="8" className={cx('empty')}>
                  Không có khuyến mãi nào
                </td>
              </tr>
            ) : (
              filteredPromotions.map((promotion) => (
                <tr key={promotion.id}>
                  <td className={cx('codeCell')}>{promotion.code}</td>
                  <td className={cx('nameCell')}>{promotion.name}</td>
                  <td>{promotion.discountValue}%</td>
                  <td>{formatDate(promotion.startDate)}</td>
                  <td>{formatDate(promotion.expiryDate)}</td>
                  <td>{promotion.usageCount || 0} / {promotion.usageLimit || 0}</td>
                  <td>{getStatusBadge(promotion.status)}</td>
                  <td>
                    <div className={cx('actions')}>
                      {promotion.status === 'PENDING' && (
                        <button
                          type="button"
                          className={cx('actionBtn', 'approveBtn')}
                          onClick={() => handleApprove(promotion.id)}
                          title="Duyệt"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={cx('actionBtn', 'editBtn')}
                        onClick={() => handleEdit(promotion)}
                        title="Sửa"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        type="button"
                        className={cx('actionBtn', 'deleteBtn')}
                        onClick={() => handleDelete(promotion.id)}
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

      {/* Modal Add/Edit Promotion */}
      {showModal && (
        <div className={cx('modalOverlay')} onClick={() => setShowModal(false)}>
          <div className={cx('modal', 'largeModal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>{editingPromotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'}</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={cx('form')}>
              <div className={cx('formRow')}>
                <div className={cx('formGroup', { error: formErrors.name })}>
                  <label>Tên khuyến mãi *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nhập tên khuyến mãi"
                  />
                  {formErrors.name && <span className={cx('errorText')}>{formErrors.name}</span>}
                </div>

                <div className={cx('formGroup', { error: formErrors.code })}>
                  <label>Mã khuyến mãi *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: SALE50"
                    disabled={!!editingPromotion}
                  />
                  {formErrors.code && <span className={cx('errorText')}>{formErrors.code}</span>}
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup', { error: formErrors.discountValue })}>
                  <label>Giá trị giảm giá (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder="0"
                  />
                  {formErrors.discountValue && <span className={cx('errorText')}>{formErrors.discountValue}</span>}
                </div>

                <div className={cx('formGroup')}>
                  <label>Giảm tối đa</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxDiscountValue}
                    onChange={(e) => setFormData({ ...formData, maxDiscountValue: e.target.value })}
                    placeholder="Không giới hạn"
                  />
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup', { error: formErrors.startDate })}>
                  <label>Ngày bắt đầu *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                  {formErrors.startDate && <span className={cx('errorText')}>{formErrors.startDate}</span>}
                </div>

                <div className={cx('formGroup', { error: formErrors.expiryDate })}>
                  <label>Ngày kết thúc *</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                  {formErrors.expiryDate && <span className={cx('errorText')}>{formErrors.expiryDate}</span>}
                </div>
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup')}>
                  <label>Đơn hàng tối thiểu</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                    placeholder="Không yêu cầu"
                  />
                </div>

                <div className={cx('formGroup', { error: formErrors.usageLimit })}>
                  <label>Giới hạn sử dụng *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    placeholder="0"
                  />
                  {formErrors.usageLimit && <span className={cx('errorText')}>{formErrors.usageLimit}</span>}
                </div>
              </div>

              <div className={cx('formGroup')}>
                <label>Mô tả</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả về khuyến mãi"
                />
              </div>

              <div className={cx('formGroup')}>
                <label>URL hình ảnh</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className={cx('formGroup')}>
                <label>Áp dụng cho danh mục (chọn nhiều)</label>
                <div className={cx('checkboxGroup')}>
                  {categories.map(cat => (
                    <label key={cat.id} className={cx('checkboxLabel')}>
                      <input
                        type="checkbox"
                        checked={formData.categoryIds.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={cx('formGroup')}>
                <label>Áp dụng cho sản phẩm (chọn nhiều)</label>
                <div className={cx('checkboxGroup')}>
                  {products.slice(0, 20).map(product => (
                    <label key={product.id} className={cx('checkboxLabel')}>
                      <input
                        type="checkbox"
                        checked={formData.productIds.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                      />
                      <span>{product.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={cx('formActions')}>
                <button type="button" className={cx('cancelBtn')} onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className={cx('submitBtn')}>
                  {editingPromotion ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageVouchersPromotions;
