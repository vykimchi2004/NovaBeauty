import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTrash, faCheck, faTimes, faEye } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageVouchersPromotions.module.scss';
import notify from '~/utils/notification';
import {
  getPromotions,
  getPromotionsByStatus,
  deletePromotion,
  updatePromotion,
  approvePromotion,
} from '~/services/promotion';
import { getCategories } from '~/services/category';
import { getProducts } from '~/services/product';
import fallbackImage from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

function ManageVouchersPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [filteredPromotions, setFilteredPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('PENDING_APPROVAL');
  const [showModal, setShowModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    applySearchFilter();
  }, [searchTerm, promotions]);

  useEffect(() => {
    fetchPromotions(filterStatus);
  }, [filterStatus]);

  const fetchPromotions = async (status = 'all') => {
    try {
      setLoading(true);
      let data;
      if (status === 'all') {
        data = await getPromotions();
      } else {
        data = await getPromotionsByStatus(status);
      }
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

  const applySearchFilter = () => {
    let filtered = [...promotions];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(promo =>
        promo.name?.toLowerCase().includes(term) ||
        promo.code?.toLowerCase().includes(term) ||
        promo.id?.toLowerCase().includes(term)
      );
    }

    setFilteredPromotions(filtered);
  };

  const buildPromotionPayload = (promotion, overrides = {}) => ({
    name: promotion.name,
    code: promotion.code,
    imageUrl: promotion.imageUrl,
    description: promotion.description,
    discountValue: promotion.discountValue,
    minOrderValue: promotion.minOrderValue,
    maxDiscountValue: promotion.maxDiscountValue,
    startDate: promotion.startDate,
    expiryDate: promotion.expiryDate,
    usageLimit: promotion.usageLimit,
    categoryIds:
      Array.isArray(promotion.categoryIds) && promotion.categoryIds.length ? promotion.categoryIds : null,
    productIds:
      Array.isArray(promotion.productIds) && promotion.productIds.length ? promotion.productIds : null,
    discountValueType: promotion.discountValueType,
    applyScope: promotion.applyScope,
    ...overrides,
  });

  const closeModal = () => {
    setShowModal(false);
    setSelectedPromotion(null);
  };

  const handleViewDetail = (promotion) => {
    setSelectedPromotion(promotion);
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
      if (selectedPromotion?.id === promotionId) {
        closeModal();
      }
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
      await approvePromotion({ promotionId, action: 'APPROVE' });
      notify.success('Đã duyệt khuyến mãi thành công!');
      closeModal();
      fetchPromotions(filterStatus);
    } catch (err) {
      console.error('Error approving promotion:', err);
      notify.error('Không thể duyệt khuyến mãi. Vui lòng thử lại.');
    }
  };

  const handleReject = async (promotion) => {
    const reason = window.prompt('Nhập lý do từ chối', '');
    if (reason === null) return;
    const trimmed = reason.trim();
    if (!trimmed) return;
    try {
      await approvePromotion({
        promotionId: promotion.id,
        action: 'REJECT',
        reason: trimmed,
      });
      notify.success('Đã từ chối khuyến mãi.');
      closeModal();
      fetchPromotions(filterStatus);
    } catch (err) {
      console.error('Error rejecting promotion:', err);
      notify.error('Không thể từ chối khuyến mãi. Vui lòng thử lại.');
    }
  };


  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING_APPROVAL: { label: 'Chờ duyệt', class: 'pending' },
      APPROVED: { label: 'Đã duyệt', class: 'approved' },
      REJECTED: { label: 'Từ chối', class: 'rejected' },
      EXPIRED: { label: 'Hết hạn', class: 'expired' },
    };
    const statusInfo = statusMap[status] || { label: status, class: 'default' };
    return <span className={cx('statusBadge', statusInfo.class)}>{statusInfo.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const formatCurrency = (value, suffix = '₫') => {
    if (value === null || value === undefined) return 'Không áp dụng';
    return `${new Intl.NumberFormat('vi-VN').format(value)} ${suffix}`.trim();
  };

  const formatUsageLimit = (value) => {
    if (value === null || value === undefined || value <= 0) {
      return 'Không giới hạn';
    }
    return `${value} lượt`;
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
              <option value="PENDING_APPROVAL">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
              <option value="EXPIRED">Hết hạn</option>
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
                  <td>
                    {promotion.usageCount || 0} / {formatUsageLimit(promotion.usageLimit)}
                  </td>
                  <td>{getStatusBadge(promotion.status)}</td>
                  <td>
                    <div className={cx('actions')}>
                        <button
                          type="button"
                        className={cx('actionBtn', 'viewBtn')}
                        onClick={() => handleViewDetail(promotion)}
                        title="Chi tiết"
                      >
                        <FontAwesomeIcon icon={faEye} />
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

      {showModal && selectedPromotion && (
        <div className={cx('modalOverlay')} onClick={closeModal}>
          <div className={cx('detailModalWrapper')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('detailCard')}>
              <div className={cx('detailLeft')}>
                <div className={cx('detailImage')}>
                  <img
                    className={cx('detailMainImage')}
                    src={selectedPromotion.imageUrl || fallbackImage}
                    alt={selectedPromotion.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = fallbackImage;
                    }}
                  />
                </div>
              </div>

              <div className={cx('detailRight')}>
                <div className={cx('detailHeaderBlock')}>
                  <h3>Chi tiết khuyến mãi</h3>
                  <div className={cx('detailStatus')}>{getStatusBadge(selectedPromotion.status)}</div>
                </div>

                <div className={cx('detailInfoList')}>
                  {[
                    { label: 'Mã khuyến mãi', value: selectedPromotion.code || '-' },
                    { label: 'Tên khuyến mãi', value: selectedPromotion.name || '-' },
                    {
                      label: 'Loại áp dụng',
                      value:
                        selectedPromotion.applyScope === 'PRODUCT'
                          ? 'Theo sản phẩm'
                          : selectedPromotion.applyScope === 'CATEGORY'
                          ? 'Theo danh mục'
                          : 'Toàn bộ đơn hàng',
                    },
                    {
                      label: 'Giá trị giảm',
                      value:
                        selectedPromotion.discountValueType === 'AMOUNT'
                          ? formatCurrency(selectedPromotion.discountValue)
                          : `${selectedPromotion.discountValue ?? 0}%`,
                    },
                    {
                      label: 'Đơn tối thiểu',
                      value:
                        selectedPromotion.minOrderValue && selectedPromotion.minOrderValue > 0
                          ? formatCurrency(selectedPromotion.minOrderValue)
                          : 'Không yêu cầu',
                    },
                    {
                      label: 'Giảm tối đa',
                      value:
                        selectedPromotion.maxDiscountValue && selectedPromotion.maxDiscountValue > 0
                          ? formatCurrency(selectedPromotion.maxDiscountValue)
                          : 'Không giới hạn',
                    },
                    {
                      label: 'Thời gian áp dụng',
                      value: `${formatDate(selectedPromotion.startDate)} - ${formatDate(selectedPromotion.expiryDate)}`,
                    },
                    {
                      label: 'Giới hạn sử dụng',
                      value: formatUsageLimit(selectedPromotion.usageLimit),
                    },
                  ].map((item) => (
                    <div className={cx('detailInfoRow')} key={item.label}>
                      <span className={cx('detailInfoLabel')}>{item.label}</span>
                      <span className={cx('detailInfoValue')}>{item.value}</span>
                </div>
                  ))}
              </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Mô tả</span>
                  <p className={cx('detailParagraph')}>{selectedPromotion.description || 'Không có mô tả'}</p>
                </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Danh mục áp dụng</span>
                  <div className={cx('chipGroup')}>
                    {selectedPromotion.categoryIds?.length
                      ? selectedPromotion.categoryIds.map((id) => (
                          <span key={id} className={cx('chip')}>
                            {categories.find((c) => c.id === id)?.name || id}
                          </span>
                        ))
                      : 'Không áp dụng'}
                </div>
              </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Sản phẩm áp dụng</span>
                  <div className={cx('chipGroup')}>
                    {selectedPromotion.productIds?.length
                      ? selectedPromotion.productIds.map((id) => (
                          <span key={id} className={cx('chip')}>
                            {products.find((p) => p.id === id)?.name || id}
                          </span>
                        ))
                      : 'Không áp dụng'}
                </div>
              </div>
                <div className={cx('detailActions')}>
                  <button type="button" className={cx('cancelBtn')} onClick={closeModal}>
                    Đóng
                  </button>
                  {selectedPromotion.status === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        type="button"
                        className={cx('approveBtn')}
                        onClick={() => handleApprove(selectedPromotion.id)}
                      >
                        <FontAwesomeIcon icon={faCheck} />
                        Duyệt
                      </button>
                      <button
                        type="button"
                        className={cx('rejectBtn')}
                        onClick={() => handleReject(selectedPromotion)}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                        Không duyệt
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={cx('deleteBtn')}
                    onClick={() => handleDelete(selectedPromotion.id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    Xóa khuyến mãi
                  </button>
                </div>
              </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageVouchersPromotions;


