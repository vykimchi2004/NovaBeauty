import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faCalendarDays,
  faArrowRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import styles from '../Profile.module.scss';
import orderService from '~/services/order';
import { STATUS_CLASS_MAP } from '../constants';
import defaultProductImage from '~/assets/images/products/image1.jpg';
import { formatCurrency } from '~/services/utils';
import CancelOrderDialog from '~/components/Common/ConfirmDialog/CancelOrderDialog';

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
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Map status enum từ backend sang Vietnamese text
  const mapStatusToVietnamese = (status) => {
    if (!status) return 'Chờ xác nhận';
    const statusUpper = status.toUpperCase();
    // Map enum names từ backend
    if (statusUpper === 'CREATED' || statusUpper === 'PENDING') return 'Chờ xác nhận';
    if (statusUpper === 'CONFIRMED' || statusUpper === 'PAID') return 'Chờ lấy hàng';
    if (statusUpper === 'SHIPPED') return 'Đang giao hàng';
    if (statusUpper === 'DELIVERED') return 'Đã giao';
    if (statusUpper.startsWith('RETURN_') || statusUpper === 'RETURNED' || statusUpper === 'REFUNDED') return 'Trả hàng/hoàn tiền';
    if (statusUpper === 'CANCELLED') return 'Đã hủy';
    // Fallback: check Vietnamese text
    const statusLower = status.toLowerCase();
    if (statusLower.includes('chờ xác nhận') || statusLower.includes('pending')) return 'Chờ xác nhận';
    if (statusLower.includes('chờ lấy hàng') || statusLower.includes('ready')) return 'Chờ lấy hàng';
    if (statusLower.includes('đang giao') || statusLower.includes('shipping')) return 'Đang giao hàng';
    if (statusLower.includes('đã giao') || statusLower.includes('delivered')) return 'Đã giao';
    if (statusLower.includes('trả hàng') || statusLower.includes('return') || statusLower.includes('refund')) return 'Trả hàng/hoàn tiền';
    if (statusLower.includes('đã hủy') || statusLower.includes('cancelled')) return 'Đã hủy';
    return 'Chờ xác nhận';
  };

  // Map status từ API sang statusKey
  const getStatusKey = (status) => {
    if (!status) return 'pending';
    const statusUpper = status.toUpperCase();
    // Map enum names từ backend
    if (statusUpper === 'CREATED' || statusUpper === 'PENDING') return 'pending';
    if (statusUpper === 'CONFIRMED' || statusUpper === 'PAID') return 'ready';
    if (statusUpper === 'SHIPPED') return 'shipping';
    if (statusUpper === 'DELIVERED') return 'delivered';
    if (statusUpper.startsWith('RETURN_') || statusUpper === 'RETURNED' || statusUpper === 'REFUNDED') return 'returned';
    if (statusUpper === 'CANCELLED') return 'cancelled';
    // Fallback: check Vietnamese text or English keywords
    const statusLower = status.toLowerCase();
    if (statusLower.includes('chờ xác nhận') || statusLower.includes('pending')) return 'pending';
    if (statusLower.includes('chờ lấy hàng') || statusLower.includes('ready') || statusLower.includes('paid')) return 'ready';
    if (statusLower.includes('đang giao') || statusLower.includes('shipping')) return 'shipping';
    if (statusLower.includes('đã giao') || statusLower.includes('delivered')) return 'delivered';
    if (statusLower.includes('trả hàng') || statusLower.includes('return') || statusLower.includes('refund')) return 'returned';
    if (statusLower.includes('đã hủy') || statusLower.includes('cancelled')) return 'cancelled';
    return 'pending';
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getMyOrders();
      // Map dữ liệu từ API về format cần thiết
      const mappedOrders = Array.isArray(data)
        ? data
            .map((order, index) => {
              if (!order) return null;
              const orderDate = order.orderDateTime
                ? new Date(order.orderDateTime)
                : order.createdAt
                ? new Date(order.createdAt)
                : order.orderDate
                ? new Date(order.orderDate)
                : new Date();

              const rawStatus = order.status || 'CREATED';
              const status = mapStatusToVietnamese(rawStatus);
              const statusKey = getStatusKey(rawStatus);

              const mappedItems =
                order.items?.map((item, idx) => ({
                  name: item.name || item.product?.name || 'Sản phẩm',
                  quantity: item.quantity || 1,
                  thumbnail:
                    item.imageUrl ||
                    item.product?.defaultMedia?.mediaUrl ||
                    item.product?.mediaUrls?.[0] ||
                    defaultProductImage,
                  _idx: idx,
                })) || [];

              const orderId = order.id || order.code || `DH${order.id || index}`;
              const displayCode = order.code || order.id || `DH${order.id || index}`;

              return {
                key: orderId,
                id: orderId,
                orderId,
                displayCode,
                date: orderDate.toISOString().split('T')[0],
                dateDisplay: orderDate.toLocaleDateString('vi-VN'),
                total:
                  typeof order.totalAmount === 'number'
                    ? `${order.totalAmount.toLocaleString('vi-VN')}đ`
                    : order.totalAmount || '0đ',
                status,
                statusKey,
                items: mappedItems,
                rawStatus,
              };
            })
            .filter(Boolean)
        : [];
      setOrders(mappedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (orderId) => {
    if (!orderId) return;
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
    
    // Nếu đã có cache, không cần load lại
    if (orderDetails[orderId]) {
      return;
    }
    
    try {
      setDetailLoading(true);
      const detail = await orderService.getOrderById(orderId);
      setOrderDetails((prev) => ({ ...prev, [orderId]: detail || null }));
    } catch (err) {
      console.error('OrdersSection: Lỗi khi tải chi tiết đơn hàng', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
    setShowCancelDialog(false);
  };

  const handleCancelOrder = () => {
    if (!selectedOrderId) return;
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async (reason) => {
    if (!selectedOrderId) return;
    try {
      setCancelling(true);
      const { ok } = await orderService.cancelOrder(selectedOrderId, reason);
      if (!ok) {
        alert('Không thể hủy đơn hàng. Vui lòng thử lại sau.');
        setCancelling(false);
        return;
      }
      // Cập nhật order details và refresh danh sách
      const updatedDetail = await orderService.getOrderById(selectedOrderId);
      setOrderDetails((prev) => ({ ...prev, [selectedOrderId]: updatedDetail || null }));
      // Refresh orders list
      await fetchOrders();
      // Đóng dialog và modal
      setShowCancelDialog(false);
      handleCloseModal();
      // Chuyển sang tab "Đã hủy"
      setActiveTab('cancelled');
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Không thể hủy đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setCancelling(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return orders
      .filter((order) => {
        // Kiểm tra statusKey trước (cách chính)
        let matchesTab = order.statusKey === activeTab;
        
        // Fallback: nếu statusKey không khớp, kiểm tra rawStatus trực tiếp
        // Điều này giúp xử lý trường hợp statusKey không được set đúng
        if (!matchesTab && order.rawStatus) {
          const rawStatus = String(order.rawStatus).trim().toUpperCase();
          const statusKeyFromRaw = getStatusKey(rawStatus);
          matchesTab = statusKeyFromRaw === activeTab;
          
          // Log để debug nếu có vấn đề với DELIVERED orders
          if (!matchesTab && activeTab === 'delivered' && rawStatus === 'DELIVERED') {
            console.warn('OrdersSection: DELIVERED order has mismatched statusKey:', {
              id: order.id,
              rawStatus: rawStatus,
              expectedStatusKey: 'delivered',
              actualStatusKey: order.statusKey,
              recalculatedStatusKey: statusKeyFromRaw
            });
          }
        }
        
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
                    <p className={cx('orderCode')}>Đơn hàng #{order.displayCode || order.id}</p>
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
                    onClick={() => handleViewDetail(order.orderId || order.id)}
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

      {/* Order Detail Modal */}
      {isModalOpen && (
        <div className={cx('orderModalOverlay')} onClick={handleCloseModal}>
          <div className={cx('orderModalContent')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('orderModalHeader')}>
              <h3>Chi tiết đơn hàng</h3>
              <button
                type="button"
                className={cx('orderModalClose')}
                onClick={handleCloseModal}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className={cx('orderModalBody')}>
              {detailLoading ? (
                <p className={cx('emptyMessage')}>Đang tải chi tiết...</p>
              ) : (
                <>
                  {orderDetails[selectedOrderId] ? (
                    <div className={cx('orderDetailGrid')}>
                      <div>
                        <p className={cx('detailLabel')}>Mã đơn hàng</p>
                        <p className={cx('detailValue')}>
                          #{orderDetails[selectedOrderId]?.code ||
                            orderDetails[selectedOrderId]?.id ||
                            '—'}
                        </p>
                      </div>
                      <div>
                        <p className={cx('detailLabel')}>Người nhận</p>
                        <p className={cx('detailValue')}>
                          {orderDetails[selectedOrderId]?.receiverName ||
                            orderDetails[selectedOrderId]?.customerName ||
                            '—'}
                        </p>
                      </div>
                      <div>
                        <p className={cx('detailLabel')}>Số điện thoại</p>
                        <p className={cx('detailValue')}>
                          {orderDetails[selectedOrderId]?.receiverPhone || '—'}
                        </p>
                      </div>
                      <div className={cx('detailFull')}>
                        <p className={cx('detailLabel')}>Địa chỉ</p>
                        <p className={cx('detailValue')}>
                          {orderDetails[selectedOrderId]?.shippingAddress || '—'}
                        </p>
                      </div>
                      <div>
                        <p className={cx('detailLabel')}>Phương thức thanh toán</p>
                        <p className={cx('detailValue')}>
                          {orderDetails[selectedOrderId]?.paymentMethod === 'COD'
                            ? 'Thanh toán khi nhận hàng (COD)'
                            : orderDetails[selectedOrderId]?.paymentMethod === 'MOMO'
                            ? 'Thanh toán qua ví MoMo'
                            : orderDetails[selectedOrderId]?.paymentMethod || '—'}
                        </p>
                      </div>
                      <div>
                        <p className={cx('detailLabel')}>Tổng tiền</p>
                        <p className={cx('detailValue', 'detailTotal')}>
                          {formatCurrency(
                            orderDetails[selectedOrderId]?.totalAmount || 0,
                            'VND',
                          )}
                        </p>
                      </div>
                      {orderDetails[selectedOrderId]?.note && (
                        <div className={cx('detailFull')}>
                          <p className={cx('detailLabel')}>Ghi chú</p>
                          <p className={cx('detailValue')}>
                            {orderDetails[selectedOrderId]?.note}
                          </p>
                        </div>
                      )}
                      <div className={cx('detailFull')}>
                        <p className={cx('detailLabel')}>Sản phẩm</p>
                        <div className={cx('detailItems')}>
                          {(orderDetails[selectedOrderId]?.items || []).map((item, idx) => (
                            <div key={idx} className={cx('detailItem')}>
                              <img
                                src={
                                  item.imageUrl ||
                                  item.product?.defaultMedia?.mediaUrl ||
                                  item.product?.mediaUrls?.[0] ||
                                  defaultProductImage
                                }
                                alt={item.name}
                                className={cx('detailItemImage')}
                              />
                              <div className={cx('detailItemInfo')}>
                                <p className={cx('detailItemName')}>
                                  {item.name || item.product?.name || 'Sản phẩm'}
                                </p>
                                <p className={cx('detailItemMeta')}>
                                  Số lượng: {item.quantity || 0} • Giá:{' '}
                                  {item.unitPrice != null
                                    ? formatCurrency(item.unitPrice, 'VND')
                                    : '—'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className={cx('emptyMessage')}>Không tải được chi tiết đơn hàng</p>
                  )}
                </>
              )}
            </div>

            <div className={cx('orderModalFooter')}>
              {orderDetails[selectedOrderId] && (() => {
                const currentOrder = orderDetails[selectedOrderId];
                const rawStatusUpper = String(currentOrder?.status || '').trim().toUpperCase();
                const canCancel = currentOrder && (
                  rawStatusUpper === 'CREATED' ||
                  rawStatusUpper === 'PENDING' ||
                  rawStatusUpper === 'CONFIRMED'
                );
                return canCancel ? (
                  <button
                    type="button"
                    className={cx('btn', 'btnDanger')}
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                    style={{ marginRight: '10px' }}
                  >
                    {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
                  </button>
                ) : null;
              })()}
              <button
                type="button"
                className={cx('btn', 'btnPrimary')}
                onClick={handleCloseModal}
              >
                Đóng
              </button>
            </div>
            <CancelOrderDialog
              open={showCancelDialog}
              loading={cancelling}
              onConfirm={handleConfirmCancel}
              onCancel={() => !cancelling && setShowCancelDialog(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersSection;



