import React, { useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faCalendarDays,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import styles from '../Profile.module.scss';

const cx = classNames.bind(styles);

const ORDER_TABS = [
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'ready', label: 'Chờ lấy hàng' },
  { id: 'shipping', label: 'Đang giao hàng' },
  { id: 'delivered', label: 'Đã giao' },
  { id: 'returned', label: 'Trả hàng' },
  { id: 'cancelled', label: 'Đã hủy' },
];

function OrdersSection({ orders, getStatusClass }) {
  const [activeTab, setActiveTab] = useState(ORDER_TABS[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [sortOption, setSortOption] = useState('newest');

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
        {filteredOrders.length === 0 ? (
          <p className={cx('emptyMessage')}>
            Không có đơn hàng nào phù hợp với bộ lọc hiện tại.
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
                  <button type="button" className={cx('orderDetailBtn')}>
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



