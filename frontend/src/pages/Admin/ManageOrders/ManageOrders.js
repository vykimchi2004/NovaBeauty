import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faEye,
  faCheck,
  faTimes,
  faTruck
} from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageOrders.module.scss';
import orderService from '~/services/order';

const cx = classNames.bind(styles);

function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, filterStatus, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getAllOrders();
      setOrders(data || []);
      setFilteredOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      // Không hiển thị alert vì API chưa có
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.id?.toLowerCase().includes(term) ||
        order.user?.email?.toLowerCase().includes(term) ||
        order.shippingAddress?.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => {
        const status = order.status?.toLowerCase() || '';
        return status === filterStatus.toLowerCase();
      });
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      CREATED: { label: 'Mới tạo', class: 'created' },
      CONFIRMED: { label: 'Đã xác nhận', class: 'confirmed' },
      PAID: { label: 'Đã thanh toán', class: 'paid' },
      SHIPPED: { label: 'Đã giao hàng', class: 'shipped' },
      DELIVERED: { label: 'Đã nhận hàng', class: 'delivered' },
      CANCELLED: { label: 'Đã hủy', class: 'cancelled' }
    };
    const statusInfo = statusMap[status] || { label: status, class: 'default' };
    return <span className={cx('statusBadge', statusInfo.class)}>{statusInfo.label}</span>;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price || 0) + ' ₫';
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
        <h2 className={cx('title')}>Quản lý đơn hàng</h2>
        <div className={cx('headerActions')}>
          <div className={cx('searchBox')}>
            <input
              type="text"
              placeholder="Tìm kiếm theo ID, email..."
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
              <option value="created">Mới tạo</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="paid">Đã thanh toán</option>
              <option value="shipped">Đã giao hàng</option>
              <option value="delivered">Đã nhận hàng</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className={cx('emptyState')}>
          <p>Chưa có đơn hàng nào</p>
          <small>API quản lý đơn hàng đang được phát triển</small>
        </div>
      ) : (
        <div className={cx('tableWrapper')}>
          <table className={cx('table')}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Khách hàng</th>
                <th>Địa chỉ giao hàng</th>
                <th>Tổng tiền</th>
                <th>Ngày đặt</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className={cx('idCell')}>{order.id?.substring(0, 8)}...</td>
                  <td>{order.user?.email || '-'}</td>
                  <td className={cx('addressCell')}>{order.shippingAddress || '-'}</td>
                  <td className={cx('priceCell')}>{formatPrice(order.totalAmount)}</td>
                  <td>{formatDate(order.orderDate)}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td>
                    <div className={cx('actions')}>
                      <button
                        type="button"
                        className={cx('actionBtn', 'viewBtn')}
                        title="Xem chi tiết"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ManageOrders;
