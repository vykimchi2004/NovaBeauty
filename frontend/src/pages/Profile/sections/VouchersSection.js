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
  faBookmark as faBookmarkSolid,
} from '@fortawesome/free-solid-svg-icons';
import { faBookmark } from '@fortawesome/free-regular-svg-icons';
import styles from '../Profile.module.scss';
import { getActivePromotions } from '~/services/promotion';
import { getActiveVouchers } from '~/services/voucher';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

const SAVED_VOUCHERS_KEY = 'saved_vouchers';
const SAVED_PROMOTIONS_KEY = 'saved_promotions';

function VouchersSection() {
  const [activeTab, setActiveTab] = useState('voucher'); // 'voucher', 'promotion', or 'saved'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vouchers, setVouchers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [savedVouchers, setSavedVouchers] = useState([]);
  const [savedPromotions, setSavedPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  // Load saved vouchers/promotions from localStorage
  useEffect(() => {
    const loadSavedItems = () => {
      try {
        const savedVouchersData = storage.get(SAVED_VOUCHERS_KEY, []);
        const savedPromotionsData = storage.get(SAVED_PROMOTIONS_KEY, []);
        setSavedVouchers(Array.isArray(savedVouchersData) ? savedVouchersData : []);
        setSavedPromotions(Array.isArray(savedPromotionsData) ? savedPromotionsData : []);
      } catch (error) {
        console.error('[VouchersSection] Error loading saved items:', error);
        setSavedVouchers([]);
        setSavedPromotions([]);
      }
    };

    loadSavedItems();
  }, []);

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
          );
        
        // Promotions: lấy từ API /promotions/active (đã là promotions từ bảng promotions)
        // Chỉ filter theo status và isActive, loại bỏ những promotion có applyScope = ORDER
        // (vì ORDER scope thường dành cho voucher, không phải promotion)
        const promotionsList = (Array.isArray(promotionsData) ? promotionsData : [])
          .filter(item => 
            item.status === 'APPROVED' && 
            item.isActive === true &&
            item.applyScope !== 'ORDER' // Promotion không nên có applyScope = ORDER
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

  const handleSaveItem = (item, type) => {
    try {
      const key = type === 'voucher' ? SAVED_VOUCHERS_KEY : SAVED_PROMOTIONS_KEY;
      const savedItems = storage.get(key, []);
      
      // Kiểm tra xem đã lưu chưa
      const isAlreadySaved = savedItems.some(saved => saved.id === item.id);
      
      if (isAlreadySaved) {
        // Nếu đã lưu, xóa khỏi danh sách
        const updatedItems = savedItems.filter(saved => saved.id !== item.id);
        storage.set(key, updatedItems);
        if (type === 'voucher') {
          setSavedVouchers(updatedItems);
        } else {
          setSavedPromotions(updatedItems);
        }
        notify.success(`Đã xóa ${type === 'voucher' ? 'voucher' : 'khuyến mãi'} khỏi danh sách đã lưu`);
      } else {
        // Nếu chưa lưu, thêm vào danh sách
        const updatedItems = [...savedItems, item];
        storage.set(key, updatedItems);
        if (type === 'voucher') {
          setSavedVouchers(updatedItems);
        } else {
          setSavedPromotions(updatedItems);
        }
        notify.success(`Đã lưu ${type === 'voucher' ? 'voucher' : 'khuyến mãi'} vào danh sách của bạn`);
      }
    } catch (error) {
      console.error('[VouchersSection] Error saving item:', error);
      notify.error('Không thể lưu. Vui lòng thử lại.');
    }
  };

  const isItemSaved = (item, type) => {
    const savedItems = type === 'voucher' ? savedVouchers : savedPromotions;
    return savedItems.some(saved => saved.id === item.id);
  };

  const filteredItems = useMemo(() => {
    let items = [];
    if (activeTab === 'voucher') {
      items = vouchers;
    } else if (activeTab === 'promotion') {
      items = promotions;
    } else if (activeTab === 'saved') {
      items = [...savedVouchers, ...savedPromotions];
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
  }, [activeTab, vouchers, promotions, savedVouchers, savedPromotions, searchTerm, selectedDate, statusFilter]);

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
        <button
          type="button"
          className={cx('vouchersTab', activeTab === 'saved' && 'vouchersTabActive')}
          onClick={() => setActiveTab('saved')}
        >
          <FontAwesomeIcon icon={faBookmarkSolid} />
          Đã lưu ({savedVouchers.length + savedPromotions.length})
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
            {activeTab === 'saved' 
              ? 'Bạn chưa lưu voucher hoặc khuyến mãi nào.' 
              : `Chưa có ${activeTab === 'voucher' ? 'voucher' : 'khuyến mãi'} nào.`}
          </p>
        ) : (
          filteredItems.map((item) => {
            // Xác định loại item dựa trên activeTab và saved items
            let itemType;
            if (activeTab === 'voucher') {
              itemType = 'voucher';
            } else if (activeTab === 'promotion') {
              itemType = 'promotion';
            } else if (activeTab === 'saved') {
              // Nếu trong tab saved, kiểm tra xem item có trong savedVouchers hay savedPromotions
              itemType = savedVouchers.some(v => v.id === item.id) ? 'voucher' : 'promotion';
            } else {
              // Fallback: dựa vào applyScope
              itemType = item.applyScope === 'ORDER' ? 'voucher' : 'promotion';
            }
            
            const isSaved = isItemSaved(item, itemType);
            
            return (
              <div key={item.id} className={cx('voucherCard', itemType === 'voucher' ? 'voucherCardType' : 'promotionCardType')}>
                <div className={cx('voucherContent')}>
                  <div className={cx('voucherInfo')}>
                    <div className={cx('voucherTypeLabel', itemType === 'voucher' ? 'voucherLabel' : 'promotionLabel')}>
                      {itemType === 'voucher' ? '🎫 VOUCHER' : '🎁 KHUYẾN MÃI'}
                    </div>
                    {item.code && (
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
                    {activeTab !== 'saved' && (
                      <button
                        type="button"
                        className={cx('saveBtn', { saved: isSaved })}
                        onClick={() => handleSaveItem(item, itemType)}
                        title={isSaved ? 'Xóa khỏi danh sách đã lưu' : 'Lưu vào danh sách'}
                      >
                        <FontAwesomeIcon icon={isSaved ? faBookmarkSolid : faBookmark} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default VouchersSection;

