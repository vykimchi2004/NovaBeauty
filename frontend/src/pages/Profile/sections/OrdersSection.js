import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faCalendarDays,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import styles from '../Profile.module.scss';
import orderService from '~/services/order';
import { STATUS_CLASS_MAP } from '../constants';

const cx = classNames.bind(styles);

const ORDER_TABS = [
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'ready', label: 'Chờ lấy hàng' },
  { id: 'shipping', label: 'Đang giao hàng' },
  { id: 'delivered', label: 'Đã giao' },
  { id: 'returned', label: 'Trả hàng' },
  { id: 'cancelled', label: 'Đã hủy' },
];

function OrdersSection({ getStatusClass, defaultTab }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab || ORDER_TABS[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [sortOption, setSortOption] = useState('newest');

  useEffect(() => {
    fetchOrders();
  }, []);

  // Map status enum từ backend sang Vietnamese text
  const mapStatusToVietnamese = (status) => {
    if (!status) return 'Chờ xác nhận';
    const statusUpper = status.toUpperCase();
    // Map enum names từ backend
    if (statusUpper === 'CREATED') return 'Chờ xác nhận';
    if (statusUpper === 'CONFIRMED') return 'Chờ lấy hàng';
    if (statusUpper === 'PAID') return 'Chờ lấy hàng';
    if (statusUpper === 'SHIPPED') return 'Đang giao hàng';
    if (statusUpper === 'DELIVERED') return 'Đã giao';
    if (statusUpper.includes('RETURN')) return 'Trả hàng';
    if (statusUpper === 'CANCELLED') return 'Đã hủy';
    // Fallback: check Vietnamese text
    const statusLower = status.toLowerCase();
    if (statusLower.includes('chờ xác nhận') || statusLower.includes('pending')) return 'Chờ xác nhận';
    if (statusLower.includes('chờ lấy hàng') || statusLower.includes('ready')) return 'Chờ lấy hàng';
    if (statusLower.includes('đang giao') || statusLower.includes('shipping')) return 'Đang giao hàng';
    if (statusLower.includes('đã giao') || statusLower.includes('delivered')) return 'Đã giao';
    if (statusLower.includes('trả hàng') || statusLower.includes('returned')) return 'Trả hàng';
    if (statusLower.includes('đã hủy') || statusLower.includes('cancelled')) return 'Đã hủy';
    return 'Chờ xác nhận';
  };

  // Map status từ API sang statusKey
  const getStatusKey = (status) => {
    if (!status) return 'pending';
    const statusUpper = status.toUpperCase();
    // Map enum names từ backend
    if (statusUpper === 'CREATED') return 'pending';
    if (statusUpper === 'CONFIRMED' || statusUpper === 'PAID') return 'ready';
    if (statusUpper === 'SHIPPED') return 'shipping';
    if (statusUpper === 'DELIVERED') return 'delivered';
    if (statusUpper.includes('RETURN')) return 'returned';
    if (statusUpper === 'CANCELLED') return 'cancelled';
    // Fallback: check Vietnamese text or English keywords
    const statusLower = status.toLowerCase();
    if (statusLower.includes('chờ xác nhận') || statusLower.includes('pending')) return 'pending';
    if (statusLower.includes('chờ lấy hàng') || statusLower.includes('ready')) return 'ready';
    if (statusLower.includes('đang giao') || statusLower.includes('shipping')) return 'shipping';
    if (statusLower.includes('đã giao') || statusLower.includes('delivered')) return 'delivered';
    if (statusLower.includes('trả hàng') || statusLower.includes('returned')) return 'returned';
    if (statusLower.includes('đã hủy') || statusLower.includes('cancelled')) return 'cancelled';
    return 'pending';
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getMyOrders();
      // Map dữ liệu từ API về format cần thiết
      const mappedOrders = Array.isArray(data) ? data.map((order) => {
        const orderDate = order.orderDateTime ? new Date(order.orderDateTime) : (order.createdAt ? new Date(order.createdAt) : new Date());
        const rawStatus = order.status || 'CREATED';
        const status = mapStatusToVietnamese(rawStatus);
        const statusKey = getStatusKey(rawStatus);
        
        return {
          id: order.code || order.id || `DH${order.id}`,
          date: orderDate.toISOString().split('T')[0],
          dateDisplay: orderDate.toLocaleDateString('vi-VN'),
          total: typeof order.totalAmount === 'number' 
            ? `${order.totalAmount.toLocaleString('vi-VN')}đ` 
            : order.totalAmount || '0đ',
          status: status,
          statusKey: statusKey,
          items: order.items?.map(item => ({
            name: item.name || 'Sản phẩm',
            quantity: item.quantity || 1,
            thumbnail: item.imageUrl || '',
          })) || [],
          orderId: order.id,
        };
      }) : [];
      setOrders(mappedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return orders
      .filter((order) => {
        const matchesTab = order.statusKey === activeTab;
        const matchesSearch =
          !search ||
          order.id.toLowerCase().includes(search) ||
          order.items?.some((item) => item.name.toLowerCase().includes(search));
        const matchesDate = !orderDate || order.date === orderDate;

        return matchesTab && matchesSearch && matchesDate;
      })
      .sort((a, b) =>
        sortOption === 'oldest'
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date),
      );
  }, [orders, activeTab, orderDate, searchTerm, sortOption]);

  return (
    <div className={cx('card', 'ordersCard')}>
      <div className={cx('ordersHeader')}>
        <h2>Lịch sử mua hàng</h2>
        <p>Quản lý và theo dõi trạng thái các đơn hàng đã đặt tại Nova Beauty.</p>
      </div>

      <div className={cx('ordersTabs')}>
        {ORDER_TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={cx('ordersTab', activeTab === tab.id && 'ordersTabActive')}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={cx('ordersFilters')}>
        <div className={cx('ordersSearchField')}>
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn, tên sản phẩm,..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className={cx('ordersDateField')}>
          <FontAwesomeIcon icon={faCalendarDays} />
          <input
            type="date"
            value={orderDate}
            onChange={(event) => setOrderDate(event.target.value)}
          />
        </div>

        <button type="button" className={cx('btn', 'btnDark')}>
          Tìm kiếm
        </button>

        <div className={cx('ordersSortField')}>
          <label htmlFor="order-sort">Sắp xếp:</label>
          <select
            id="order-sort"
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value)}
          >
            <option value="newest">Ngày mới nhất</option>
            <option value="oldest">Ngày cũ nhất</option>
          </select>
        </div>
      </div>

      <div className={cx('ordersList')}>
        {loading ? (
          <p className={cx('emptyMessage')}>Đang tải đơn hàng...</p>
        ) : filteredOrders.length === 0 ? (
          <p className={cx('emptyMessage')}>
            {orders.length === 0 
              ? 'Bạn chưa có đơn hàng nào.' 
              : 'Không có đơn hàng nào phù hợp với bộ lọc hiện tại.'}
          </p>
        ) : (
          filteredOrders.map((order) => {
            const [firstItem] = order.items || [];
            return (
              <div key={order.id} className={cx('orderCard')}>
                <div className={cx('orderHeaderRow')}>
                  <div>
                    <p className={cx('orderCode')}>Đơn hàng #{order.id}</p>
                    <span className={cx('orderDate')}>
                      Ngày đặt: {order.dateDisplay || order.date}
                    </span>
                  </div>
                  <span className={cx('orderStatus', getStatusClass(order.status))}>
                    {order.status}
                  </span>
                </div>

                <div className={cx('orderBody')}>
                  {firstItem && (
                    <img
                      src={firstItem.thumbnail}
                      alt={firstItem.name}
                      className={cx('orderThumbnail')}
                    />
                  )}
                  <div className={cx('orderInfo')}>
                    <p className={cx('orderItemName')}>{firstItem?.name}</p>
                    <span className={cx('orderItemQuantity')}>
                      Số lượng: {firstItem?.quantity ?? 0}
                    </span>
                  </div>
                  <div className={cx('orderTotal')}>
                    <span>Tổng tiền</span>
                    <strong>{order.total}</strong>
                  </div>
                </div>

                <div className={cx('orderFooter')}>
                  <button type="button" className={cx('orderActionBtn')}>
                    {order.status}
                  </button>
                  <button 
                    type="button" 
                    className={cx('orderDetailBtn')}
                    onClick={() => navigate('/staff/orders')}
                  >
                    Xem chi tiết
                    <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default OrdersSection;



