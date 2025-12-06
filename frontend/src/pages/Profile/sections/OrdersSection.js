import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faCalendarDays,
  faArrowRight,
  faXmark,
  faAngleRight,
  faAngleLeft,
} from '@fortawesome/free-solid-svg-icons';
import styles from '../Profile.module.scss';
import orderService from '~/services/order';

import defaultProductImage from '~/assets/images/products/image1.jpg';
import { formatCurrency } from '~/services/utils';
import CancelOrderDialog from '~/components/Common/ConfirmDialog/CancelOrderDialog';
import RefundRequestModal from '~/components/Common/RefundRequestModal/RefundRequestModal';

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
  const location = useLocation();
  
  // Get initial tab from URL query params, defaultTab prop, or default to first tab
  const getInitialTab = () => {
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl || defaultTab || ORDER_TABS[0].id;
  };
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => getInitialTab());
  const [searchTerm, setSearchTerm] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState(null);
  const itemsPerPage = 3;

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
                  quantity: item.quantity ?? 0,
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
      
      // Fetch chi tiết đơn hàng cho những đơn hàng không có items
      // để lấy số lượng sản phẩm
      const ordersWithoutItems = mappedOrders.filter(order => 
        !order.items || order.items.length === 0
      );
      
      if (ordersWithoutItems.length > 0) {
        // Fetch chi tiết cho các đơn hàng không có items
        Promise.all(
          ordersWithoutItems.map(async (order) => {
            try {
              const detail = await orderService.getOrderById(order.orderId || order.id);
              if (detail && detail.items) {
                setOrderDetails((prev) => ({ ...prev, [order.orderId || order.id]: detail }));
              }
            } catch (err) {
              console.error(`Error fetching detail for order ${order.id}:`, err);
            }
          })
        );
      }
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

  // Sync activeTab with URL query params when URL changes (e.g., browser back/forward or reload)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab');
    const tabToUse = tabFromUrl || defaultTab || ORDER_TABS[0].id;
    // Always sync with URL to ensure reload keeps the correct tab
    if (tabToUse !== activeTab) {
      setActiveTab(tabToUse);
    }
  }, [location.search]);

  // Reset về trang 1 khi thay đổi tab, search, filter
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, orderDate, sortOption]);

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll mượt mà lên đầu danh sách đơn hàng
    // Sử dụng requestAnimationFrame để đảm bảo DOM đã render xong
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Tìm phần header của ordersCard để scroll đến đó
        const ordersCardElement = document.querySelector(`.${cx('ordersCard')}`);
        const ordersHeaderElement = document.querySelector(`.${cx('ordersHeader')}`);
        const ordersListElement = document.querySelector(`.${cx('ordersList')}`);
        
        const targetElement = ordersHeaderElement || ordersCardElement || ordersListElement;
        
        if (targetElement) {
          const elementTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
          const offset = 100; // Offset để không sát quá đầu trang
          
          window.scrollTo({
            top: elementTop - offset,
            behavior: 'smooth'
          });
        } else {
          // Fallback: scroll lên đầu trang
          window.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
          });
        }
      }, 50);
    });
  };

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
            onClick={() => {
              setActiveTab(tab.id);
              // Update URL query params to persist tab on reload
              const searchParams = new URLSearchParams(location.search);
              if (tab.id === ORDER_TABS[0].id) {
                // If selecting default tab, remove tab param
                searchParams.delete('tab');
              } else {
                searchParams.set('tab', tab.id);
              }
              // Preserve section param if exists
              if (!searchParams.get('section')) {
                searchParams.set('section', 'orders');
              }
              const newSearch = searchParams.toString();
              navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
            }}
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
          paginatedOrders.map((order) => {
            const [firstItem] = order.items || [];
            // Tính tổng số lượng tất cả sản phẩm trong đơn
            // Nếu items rỗng, thử lấy từ orderDetails đã cache
            let itemsToCalculate = order.items || [];
            if (itemsToCalculate.length === 0 && orderDetails[order.orderId || order.id]?.items) {
              itemsToCalculate = orderDetails[order.orderId || order.id].items;
            }
            const totalQuantity = itemsToCalculate.reduce((sum, item) => {
              return sum + (item.quantity ?? 0);
            }, 0);
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
                      Số lượng: {totalQuantity}
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
                  {order.statusKey === 'delivered' && (
                    <button
                      type="button"
                      className={cx('orderRefundBtn')}
                      onClick={() => {
                        const orderId = order.orderId || order.id;
                        setRefundOrderId(orderId);
                        setShowRefundModal(true);
                      }}
                    >
                      Trả hàng/hoàn tiền
                    </button>
                  )}
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

      {/* Pagination */}
      {!loading && filteredOrders.length > 0 && totalPages > 1 && (
        <div className={cx('ordersPagination')}>
          <div className={cx('paginationPages')}>
            {(() => {
              const pages = [];
              const showPages = 5; // Số trang hiển thị xung quanh trang hiện tại
              
              // Luôn hiển thị trang đầu tiên
              pages.push(
                <button
                  key={1}
                  type="button"
                  className={cx('paginationPage', currentPage === 1 && 'active')}
                  onClick={() => handlePageChange(1)}
                >
                  1
                </button>
              );
              
              if (totalPages <= showPages + 2) {
                // Nếu tổng số trang ít, hiển thị tất cả
                for (let i = 2; i <= totalPages; i++) {
                  pages.push(
                    <button
                      key={i}
                      type="button"
                      className={cx('paginationPage', currentPage === i && 'active')}
                      onClick={() => handlePageChange(i)}
                    >
                      {i}
                    </button>
                  );
                }
              } else {
                // Logic hiển thị thông minh cho nhiều trang
                let startPage = Math.max(2, currentPage - 1);
                let endPage = Math.min(totalPages - 1, currentPage + 1);
                
                // Điều chỉnh để luôn hiển thị 5 trang ở giữa (nếu có thể)
                if (currentPage <= 3) {
                  startPage = 2;
                  endPage = Math.min(5, totalPages - 1);
                } else if (currentPage >= totalPages - 2) {
                  startPage = Math.max(2, totalPages - 4);
                  endPage = totalPages - 1;
                }
                
                // Thêm dấu "..." sau trang 1 nếu cần
                if (startPage > 2) {
                  pages.push(
                    <span key="dots-start" className={cx('paginationDots')}>
                      ...
                    </span>
                  );
                }
                
                // Thêm các trang ở giữa
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      type="button"
                      className={cx('paginationPage', currentPage === i && 'active')}
                      onClick={() => handlePageChange(i)}
                    >
                      {i}
                    </button>
                  );
                }
                
                // Thêm dấu "..." trước trang cuối nếu cần
                if (endPage < totalPages - 1) {
                  pages.push(
                    <span key="dots-end" className={cx('paginationDots')}>
                      ...
                    </span>
                  );
                }
                
                // Luôn hiển thị trang cuối cùng
                pages.push(
                  <button
                    key={totalPages}
                    type="button"
                    className={cx('paginationPage', currentPage === totalPages && 'active')}
                    onClick={() => handlePageChange(totalPages)}
                  >
                    {totalPages}
                  </button>
                );
              }
              
              return pages;
            })()}
          </div>
          
          {currentPage > 1 && (
            <button
              type="button"
              className={cx('paginationPrev')}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
          )}
          
          {currentPage < totalPages && (
            <button
              type="button"
              className={cx('paginationNext')}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
          )}
        </div>
      )}

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

      {/* Refund Request Modal */}
      <RefundRequestModal
        open={showRefundModal}
        orderId={refundOrderId}
        onClose={() => {
          setShowRefundModal(false);
          setRefundOrderId(null);
        }}
        onSuccess={() => {
          fetchOrders(); // Refresh orders list after successful refund request
        }}
      />
    </div>
  );
}

export default OrdersSection;



