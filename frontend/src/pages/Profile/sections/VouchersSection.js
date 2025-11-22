import React, { useEffect, useState, useMemo } from 'react';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faCalendarDays,
  faTicket,
  faGift,
} from '@fortawesome/free-solid-svg-icons';
import styles from '../Profile.module.scss';
import { getActivePromotions } from '~/services/promotion';
import { getActiveVouchers } from '~/services/voucher';

const cx = classNames.bind(styles);

function VouchersSection() {
  const [activeTab, setActiveTab] = useState('voucher'); // 'voucher' or 'promotion'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vouchers, setVouchers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [vouchersData, promotionsData] = await Promise.all([
          getActiveVouchers().catch(() => []),
          getActivePromotions().catch(() => []),
        ]);
        
        // Filter chỉ lấy những voucher/promotion đã được admin duyệt (status = 'APPROVED') và đang active
        const approvedVouchers = (Array.isArray(vouchersData) ? vouchersData : [])
          .filter(item => item.status === 'APPROVED' && item.isActive === true);
        
        // Filter promotions: chỉ lấy những cái có applyScope != 'ORDER' (vì ORDER là voucher) và đã được duyệt
        const promotionsList = (Array.isArray(promotionsData) ? promotionsData : [])
          .filter(item => 
            item.applyScope !== 'ORDER' && 
            item.status === 'APPROVED' && 
            item.isActive === true
          );
        
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

  const filteredItems = useMemo(() => {
    const items = activeTab === 'voucher' ? vouchers : promotions;
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

      <div className={cx('vouchersList')}>
        {filteredItems.length === 0 ? (
          <p className={cx('emptyMessage')}>
            Chưa có {activeTab === 'voucher' ? 'voucher' : 'khuyến mãi'} nào.
          </p>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className={cx('voucherCard')}>
              <div className={cx('voucherContent')}>
                <div className={cx('voucherInfo')}>
                  {item.code && (
                    <p className={cx('voucherCode')}>Mã: {item.code}</p>
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
                <div className={cx('voucherIcon')}>
                  <FontAwesomeIcon icon={activeTab === 'voucher' ? faTicket : faGift} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default VouchersSection;

