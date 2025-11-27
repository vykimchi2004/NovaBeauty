import React, { useEffect, useState, useMemo } from 'react';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faCalendarDays,
  faTicket,
  faGift,
  faCopy,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import styles from '../Profile.module.scss';
import { getActivePromotions } from '~/services/promotion';
import { getActiveVouchers } from '~/services/voucher';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);


const resolveItemType = (item = {}) => {
  const normalized =
    item.__type?.toLowerCase() ||
    item.sourceType?.toLowerCase() ||
    (typeof item.type === 'string' ? item.type.toLowerCase() : '');

  if (normalized === 'voucher' || normalized === 'promotion') {
    return normalized;
  }

  if (typeof item.isVoucher === 'boolean') {
    return item.isVoucher ? 'voucher' : 'promotion';
  }

  return item.applyScope === 'ORDER' ? 'voucher' : 'promotion';
};

function VouchersSection() {
  const [activeTab, setActiveTab] = useState('voucher'); // 'voucher' or 'promotion'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vouchers, setVouchers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [vouchersData, promotionsData] = await Promise.all([
          getActiveVouchers().catch(() => []),
          getActivePromotions().catch(() => []),
        ]);
        
        // Vouchers: lấy từ API /vouchers/active (đã là vouchers từ bảng vouchers)
        // Chỉ filter theo status và isActive
        const approvedVouchers = (Array.isArray(vouchersData) ? vouchersData : [])
          .filter(item => 
            item.status === 'APPROVED' && 
            item.isActive === true
          )
          .map((item) => ({ ...item, __type: 'voucher' }));
        
        // Promotions: lấy từ API /promotions/active (đã là promotions từ bảng promotions)
        // Chỉ filter theo status và isActive, loại bỏ những promotion có applyScope = ORDER
        // (vì ORDER scope thường dành cho voucher, không phải promotion)
        const promotionsList = (Array.isArray(promotionsData) ? promotionsData : [])
          .filter(item => 
            item.status === 'APPROVED' && 
            item.isActive === true &&
            item.applyScope !== 'ORDER' // Promotion không nên có applyScope = ORDER
          )
          .map((item) => ({ ...item, __type: 'promotion' }));
        
        setVouchers(approvedVouchers);
        setPromotions(promotionsList);
        
        console.log('[VouchersSection] Loaded data:', {
          vouchers: approvedVouchers.length,
          promotions: promotionsList.length
        });
      } catch (error) {
        console.error('[VouchersSection] Error loading data:', error);
        setVouchers([]);
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDiscount = (item) => {
    if (!item.discountValue) return '';
    if (item.discountValueType === 'PERCENTAGE') {
      return `Giảm ${item.discountValue}%`;
    } else {
      return `Giảm ${new Intl.NumberFormat('vi-VN').format(item.discountValue)}₫`;
    }
  };

  const formatMinOrder = (item) => {
    if (!item.minOrderValue || item.minOrderValue <= 0) return '';
    const value = Math.round(item.minOrderValue / 1000); // Convert to thousands
    return `từ ${value}k`;
  };

  const formatCondition = (item) => {
    if (item.applyScope === 'ORDER') {
      const minOrder = formatMinOrder(item);
      return minOrder ? `cho đơn hàng ${minOrder}` : 'cho đơn hàng';
    } else if (item.applyScope === 'PRODUCT') {
      return 'cho sản phẩm';
    } else if (item.applyScope === 'CATEGORY') {
      return 'cho danh mục';
    }
    return '';
  };

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      notify.success(`Đã sao chép mã: ${code}`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('[VouchersSection] Error copying code:', error);
      notify.error('Không thể sao chép mã. Vui lòng thử lại.');
    }
  };


  const filteredItems = useMemo(() => {
    let items = [];
    if (activeTab === 'voucher') {
      items = vouchers;
    } else if (activeTab === 'promotion') {
      items = promotions;
    }

    const search = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !search ||
        item.code?.toLowerCase().includes(search) ||
        item.name?.toLowerCase().includes(search);
      
      const matchesDate = !selectedDate || 
        (item.expiryDate && formatDate(item.expiryDate) === selectedDate);
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && item.isActive) ||
        (statusFilter === 'inactive' && !item.isActive);

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [activeTab, vouchers, promotions, searchTerm, selectedDate, statusFilter]);

  if (loading) {
    return (
      <div className={cx('card')}>
        <p>Đang tải voucher và khuyến mãi...</p>
      </div>
    );
  }

  return (
    <div className={cx('card', 'vouchersCard')}>
      <div className={cx('vouchersHeader')}>
        <h2>Voucher và khuyến mãi</h2>
        <p>Xem và quản lý các voucher và khuyến mãi đang áp dụng.</p>
      </div>

      <div className={cx('vouchersTabs')}>
        <button
          type="button"
          className={cx('vouchersTab', activeTab === 'voucher' && 'vouchersTabActive')}
          onClick={() => setActiveTab('voucher')}
        >
          <FontAwesomeIcon icon={faTicket} />
          Voucher
        </button>
        <button
          type="button"
          className={cx('vouchersTab', activeTab === 'promotion' && 'vouchersTabActive')}
          onClick={() => setActiveTab('promotion')}
        >
          <FontAwesomeIcon icon={faGift} />
          Khuyến mãi
        </button>
      </div>

      <div className={cx('vouchersFilters')}>
        <div className={cx('vouchersSearchField')}>
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã voucher, tên khuyến mãi..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className={cx('vouchersDateField')}>
          <FontAwesomeIcon icon={faCalendarDays} />
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>

        <button type="button" className={cx('btn', 'btnDark')}>
          Tìm kiếm
        </button>

        <div className={cx('vouchersSortField')}>
          <label htmlFor="status-sort">Sắp xếp:</label>
          <select
            id="status-sort"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>
        </div>
      </div>

      {activeTab === 'promotion' ? (
        // Table view for promotions
        <div className={cx('promotionsTableWrapper')}>
          {filteredItems.length === 0 ? (
            <p className={cx('emptyMessage')}>Chưa có khuyến mãi nào.</p>
          ) : (
            <table className={cx('promotionsTable')}>
              <thead>
                <tr>
                  <th>Tên khuyến mãi</th>
                  <th>Giảm giá</th>
                  <th>Áp dụng cho</th>
                  <th>Ngày bắt đầu</th>
                  <th>Ngày kết thúc</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className={cx('nameCell')}>
                          {item.name || 'Khuyến mãi'}
                          {item.description && (
                            <span className={cx('description')}>{item.description}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={cx('discountCell')}>
                          {formatDiscount(item)}
                        </span>
                      </td>
                      <td>
                        <span className={cx('scopeCell')}>
                          {formatCondition(item)}
                          {item.applyScope === 'CATEGORY' && item.categoryNames && (
                            <span className={cx('categoryNames')}>
                              {Array.isArray(item.categoryNames) ? item.categoryNames.join(', ') : item.categoryNames}
                            </span>
                          )}
                          {item.applyScope === 'PRODUCT' && item.productNames && (
                            <span className={cx('productNames')}>
                              {Array.isArray(item.productNames) ? item.productNames.slice(0, 2).join(', ') : item.productNames}
                              {Array.isArray(item.productNames) && item.productNames.length > 2 && ` +${item.productNames.length - 2} sản phẩm`}
                            </span>
                          )}
                        </span>
                      </td>
                      <td>{item.startDate ? formatDate(item.startDate) : '-'}</td>
                      <td>{item.expiryDate ? formatDate(item.expiryDate) : '-'}</td>
                      <td>
                        <span className={cx('statusBadge', item.isActive ? 'statusActive' : 'statusInactive')}>
                          {item.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        // Card view for vouchers
        <div className={cx('vouchersList')}>
          {filteredItems.length === 0 ? (
            <p className={cx('emptyMessage')}>
              Chưa có voucher nào.
            </p>
          ) : (
            filteredItems.map((item) => {
              const itemType = resolveItemType(item);
              
              return (
                <div key={item.id} className={cx('voucherCard', itemType === 'voucher' ? 'voucherCardType' : 'promotionCardType')}>
                  <div className={cx('voucherContent')}>
                    <div className={cx('voucherInfo')}>
                      <div className={cx('voucherTypeLabel', itemType === 'voucher' ? 'voucherLabel' : 'promotionLabel')}>
                        {itemType === 'voucher' ? '🎫 VOUCHER' : '🎁 KHUYẾN MÃI'}
                      </div>
                      {item.code && itemType === 'voucher' && (
                        <div className={cx('voucherCodeRow')}>
                          <p className={cx('voucherCode')}>Mã: <strong>{item.code}</strong></p>
                          <button
                            type="button"
                            className={cx('copyBtn')}
                            onClick={() => handleCopyCode(item.code)}
                            title="Sao chép mã"
                          >
                            <FontAwesomeIcon icon={copiedCode === item.code ? faCheck : faCopy} />
                          </button>
                        </div>
                      )}
                      <h3 className={cx('voucherTitle')}>
                        {formatDiscount(item)} {formatCondition(item)}
                      </h3>
                      {item.expiryDate && (
                        <p className={cx('voucherExpiry')}>
                          Hạn sử dụng: {formatDate(item.expiryDate)}
                        </p>
                      )}
                    </div>
                    <div className={cx('voucherActions')}>
                      <div className={cx('voucherIcon', itemType === 'voucher' ? 'voucherIconType' : 'promotionIconType')}>
                        <FontAwesomeIcon icon={itemType === 'voucher' ? faTicket : faGift} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default VouchersSection;

