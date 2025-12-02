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
import {
  getVouchers,
  getVouchersByStatus,
  deleteVoucher,
  updateVoucher,
  approveVoucher,
} from '~/services/voucher';
import { getCategories } from '~/services/category';
import { getProducts } from '~/services/product';
import fallbackImage from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

function ManageVouchersPromotions() {
  const [activeTab, setActiveTab] = useState('voucher'); // 'promotion' or 'voucher' - default to 'voucher' since staff creates vouchers
  const [promotions, setPromotions] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // Default to 'all' to show all items
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    applySearchFilter();
  }, [searchTerm, promotions, vouchers, activeTab]);

  useEffect(() => {
    if (activeTab === 'promotion') {
      fetchPromotions(filterStatus);
    } else {
      fetchVouchers(filterStatus);
    }
  }, [filterStatus, activeTab]);

  const fetchPromotions = async (status = 'all') => {
    try {
      setLoading(true);
      let data;
      if (status === 'all') {
        data = await getPromotions();
      } else {
        data = await getPromotionsByStatus(status);
      }
      const promotionsList = Array.isArray(data) ? data : [];
      console.log('[ManageVouchersPromotions] Fetched promotions:', {
        count: promotionsList.length,
        status,
        items: promotionsList.map(p => ({ id: p.id, code: p.code, name: p.name }))
      });
      setPromotions(promotionsList);
    } catch (err) {
      console.error('Error fetching promotions:', err);
      notify.error('Không thể tải danh sách khuyến mãi. Vui lòng thử lại.');
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVouchers = async (status = 'all') => {
    try {
      setLoading(true);
      let data;
      if (status === 'all') {
        data = await getVouchers();
      } else {
        data = await getVouchersByStatus(status);
      }
      const vouchersList = Array.isArray(data) ? data : [];
      console.log('[ManageVouchersPromotions] Fetched vouchers:', {
        count: vouchersList.length,
        status,
        items: vouchersList.map(v => ({ id: v.id, code: v.code, name: v.name }))
      });
      setVouchers(vouchersList);
    } catch (err) {
      console.error('Error fetching vouchers:', err);
      notify.error('Không thể tải danh sách voucher. Vui lòng thử lại.');
      setVouchers([]);
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
    const items = activeTab === 'promotion' ? promotions : vouchers;
    let filtered = [...items];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(term) ||
        item.code?.toLowerCase().includes(term) ||
        item.id?.toLowerCase().includes(term)
      );
    }

    console.log('[ManageVouchersPromotions] Filtered items:', {
      activeTab,
      totalItems: items.length,
      filteredCount: filtered.length,
      searchTerm
    });

    setFilteredItems(filtered);
  };

  const handleViewDetail = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleDelete = async (itemId) => {
    const confirmed = await notify.confirm(
      `Bạn có chắc chắn muốn xóa ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'} này?`,
      `Xác nhận xóa ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'}`,
      'Xóa',
      'Hủy'
    );
    
    if (!confirmed) return;

    try {
      if (activeTab === 'promotion') {
        await deletePromotion(itemId);
        setPromotions(promotions.filter(p => p.id !== itemId));
      } else {
        await deleteVoucher(itemId);
        setVouchers(vouchers.filter(v => v.id !== itemId));
      }
      notify.success(`Xóa ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'} thành công!`);
      if (selectedItem?.id === itemId) {
        closeModal();
      }
    } catch (err) {
      console.error(`Error deleting ${activeTab}:`, err);
      notify.error(`Không thể xóa ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'}. Vui lòng thử lại.`);
    }
  };

  const handleApprove = async (itemId) => {
    const confirmed = await notify.confirm(
      `Bạn có chắc muốn duyệt ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'} này?`,
      `Xác nhận duyệt ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'}`,
      'Duyệt',
      'Hủy'
    );
    
    if (!confirmed) return;

    try {
      if (activeTab === 'promotion') {
        await approvePromotion({ promotionId: itemId, action: 'APPROVE' });
      } else {
        await approveVoucher({ voucherId: itemId, action: 'APPROVE' });
      }
      notify.success(`Đã duyệt ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'} thành công!`);
      closeModal();
      if (activeTab === 'promotion') {
        fetchPromotions(filterStatus);
      } else {
        fetchVouchers(filterStatus);
      }
    } catch (err) {
      console.error(`Error approving ${activeTab}:`, err);
      notify.error(`Không thể duyệt ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'}. Vui lòng thử lại.`);
    }
  };

  const handleReject = async (item) => {
    const reason = window.prompt('Nhập lý do từ chối', '');
    if (reason === null) return;
    const trimmed = reason.trim();
    if (!trimmed) return;
    try {
      if (activeTab === 'promotion') {
        await approvePromotion({
          promotionId: item.id,
          action: 'REJECT',
          reason: trimmed,
        });
      } else {
        await approveVoucher({
          voucherId: item.id,
          action: 'REJECT',
          reason: trimmed,
        });
      }
      notify.success(`Đã từ chối ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'}.`);
      closeModal();
      if (activeTab === 'promotion') {
        fetchPromotions(filterStatus);
      } else {
        fetchVouchers(filterStatus);
      }
    } catch (err) {
      console.error(`Error rejecting ${activeTab}:`, err);
      notify.error(`Không thể từ chối ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'}. Vui lòng thử lại.`);
    }
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
    setSelectedItem(null);
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
        <div className={cx('tabs')}>
          <button
            type="button"
            className={cx('tab', activeTab === 'promotion' && 'tabActive')}
            onClick={() => setActiveTab('promotion')}
          >
            Khuyến mãi
          </button>
          <button
            type="button"
            className={cx('tab', activeTab === 'voucher' && 'tabActive')}
            onClick={() => setActiveTab('voucher')}
          >
            Voucher
          </button>
        </div>
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
              <th>Loại</th>
              <th>Mã</th>
              <th>{activeTab === 'voucher' ? 'Tên voucher' : 'Tên khuyến mãi'}</th>
              <th>Giảm giá</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
              <th>Đã dùng</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="9" className={cx('empty')}>
                  Không có {activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'} nào
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className={cx(activeTab === 'voucher' ? 'voucherRow' : 'promotionRow')}>
                  <td>
                    <span className={cx('typeBadge', activeTab === 'voucher' ? 'voucherBadge' : 'promotionBadge')}>
                      {activeTab === 'voucher' ? 'VOUCHER' : 'KHUYẾN MÃI'}
                    </span>
                  </td>
                  <td className={cx('codeCell')}>{item.code}</td>
                  <td className={cx('nameCell')}>{item.name || '-'}</td>
                  <td>
                    {item.discountValueType === 'PERCENTAGE' 
                      ? `${item.discountValue}%` 
                      : `${new Intl.NumberFormat('vi-VN').format(item.discountValue)}₫`}
                  </td>
                  <td>{formatDate(item.startDate)}</td>
                  <td>{formatDate(item.expiryDate)}</td>
                  <td>
                    {item.usageCount || 0} / {formatUsageLimit(item.usageLimit)}
                  </td>
                  <td>{getStatusBadge(item.status)}</td>
                  <td>
                    <div className={cx('actions')}>
                        <button
                          type="button"
                        className={cx('actionBtn', 'viewBtn')}
                        onClick={() => handleViewDetail(item)}
                        title="Chi tiết"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        type="button"
                        className={cx('actionBtn', 'deleteBtn')}
                        onClick={() => handleDelete(item.id)}
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

      {showModal && selectedItem && (
        <div className={cx('modalOverlay')} onClick={closeModal}>
          <div className={cx('detailModalWrapper')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('detailCard')}>
              <div className={cx('detailLeft')}>
                <div className={cx('detailImage')}>
                  <img
                    className={cx('detailMainImage')}
                    src={selectedItem.imageUrl || fallbackImage}
                    alt={selectedItem.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = fallbackImage;
                    }}
                  />
                </div>
              </div>

              <div className={cx('detailRight')}>
                <div className={cx('detailHeaderBlock')}>
                  <h3>Chi tiết {activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'}</h3>
                  <div className={cx('detailStatus')}>{getStatusBadge(selectedItem.status)}</div>
                </div>

                <div className={cx('detailInfoList')}>
                  {[
                    { label: `Mã ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'}`, value: selectedItem.code || '-' },
                    { label: `Tên ${activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'}`, value: selectedItem.name || '-' },
                    {
                      label: 'Loại áp dụng',
                      value:
                        selectedItem.applyScope === 'PRODUCT'
                          ? 'Theo sản phẩm'
                          : selectedItem.applyScope === 'CATEGORY'
                          ? 'Theo danh mục'
                          : 'Toàn bộ đơn hàng',
                    },
                    {
                      label: 'Giá trị giảm',
                      value:
                        selectedItem.discountValueType === 'AMOUNT'
                          ? formatCurrency(selectedItem.discountValue)
                          : `${selectedItem.discountValue ?? 0}%`,
                    },
                    {
                      label: 'Đơn tối thiểu',
                      value:
                        selectedItem.minOrderValue && selectedItem.minOrderValue > 0
                          ? formatCurrency(selectedItem.minOrderValue)
                          : 'Không yêu cầu',
                    },
                    {
                      label: 'Giảm tối đa',
                      value:
                        selectedItem.maxDiscountValue && selectedItem.maxDiscountValue > 0
                          ? formatCurrency(selectedItem.maxDiscountValue)
                          : 'Không giới hạn',
                    },
                    {
                      label: 'Thời gian áp dụng',
                      value: `${formatDate(selectedItem.startDate)} - ${formatDate(selectedItem.expiryDate)}`,
                    },
                    {
                      label: 'Giới hạn sử dụng',
                      value: formatUsageLimit(selectedItem.usageLimit),
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
                  <p className={cx('detailParagraph')}>{selectedItem.description || 'Không có mô tả'}</p>
                </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Danh mục áp dụng</span>
                  <div className={cx('chipGroup')}>
                    {selectedItem.categoryIds?.length
                      ? selectedItem.categoryIds.map((id) => (
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
                    {selectedItem.productIds?.length
                      ? selectedItem.productIds.map((id) => (
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
                  {selectedItem.status === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        type="button"
                        className={cx('approveBtn')}
                        onClick={() => handleApprove(selectedItem.id)}
                      >
                        <FontAwesomeIcon icon={faCheck} />
                        Duyệt
                      </button>
                      <button
                        type="button"
                        className={cx('rejectBtn')}
                        onClick={() => handleReject(selectedItem)}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                        Không duyệt
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={cx('deleteBtn')}
                    onClick={() => handleDelete(selectedItem.id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    Xóa {activeTab === 'promotion' ? 'khuyến mãi' : 'voucher'}
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


