import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './OrderHistoryPage.module.scss';
import { formatCurrency, getApiBaseUrl, getStoredToken } from '~/services/utils';
import orderService from '~/services/order';
import defaultProductImage from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

const parseShippingInfo = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return {
                name: parsed.name || parsed.receiverName || '',
                phone: parsed.phone || parsed.receiverPhone || '',
                address: parsed.address || parsed.fullAddress || '',
            };
        }
    } catch {
        return { address: raw };
    }
    return { address: raw };
};

// Mapping status
const STATUS_MAP = {
    PENDING: { label: 'Chờ xác nhận', key: 'pending' },
    CONFIRMED: { label: 'Chờ lấy hàng', key: 'confirmed' },
    SHIPPING: { label: 'Chờ giao hàng', key: 'shipping' },
    DELIVERED: { label: 'Đã giao', key: 'delivered' },
    RETURNING: { label: 'Trả hàng', key: 'returning' },
    CANCELLED: { label: 'Đã hủy', key: 'cancelled' },
    RETURN_REQUESTED: { label: 'Trả hàng/hoàn tiền', key: 'return-requested' },
    RETURN_CS_CONFIRMED: { label: 'CSKH đang xử lý', key: 'return-requested' },
    RETURN_STAFF_CONFIRMED: { label: 'Nhân viên xác nhận hàng', key: 'return-requested' },
    REFUNDED: { label: 'Hoàn tiền thành công', key: 'refunded' },
    RETURN_REJECTED: { label: 'Từ chối Trả hàng/hoàn tiền', key: 'return-rejected' },
};

const TABS = [
    { key: 'pending', label: 'Chờ xác nhận', status: 'PENDING' },
    { key: 'confirmed', label: 'Chờ lấy hàng', status: 'CONFIRMED' },
    { key: 'shipping', label: 'Chờ giao hàng', status: 'SHIPPING' },
    { key: 'delivered', label: 'Đã giao', status: 'DELIVERED' },
    { key: 'return-requested', label: 'Trả hàng/hoàn tiền', status: 'RETURN_REQUESTED' },
    { key: 'cancelled', label: 'Đã hủy', status: 'CANCELLED' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Ngày mới nhất' },
    { value: 'oldest', label: 'Ngày cũ nhất' },
    { value: 'price-high', label: 'Giá cao đến thấp' },
    { value: 'price-low', label: 'Giá thấp đến cao' },
];

// Chuyển trạng thái từ backend (CREATED, PENDING, PAID, SHIPPED, DELIVERED, CANCELLED)
// sang trạng thái hiển thị cho khách (PENDING, CONFIRMED, SHIPPING, DELIVERED, CANCELLED)
const mapOrderStatus = (statusRaw) => {
    const status = String(statusRaw || '').toUpperCase();
    switch (status) {
        case 'CREATED':
        case 'PENDING':
        case 'PAID':
            return { mappedStatus: 'PENDING', ...STATUS_MAP.PENDING };
        case 'CONFIRMED':
            return { mappedStatus: 'CONFIRMED', ...STATUS_MAP.CONFIRMED };
        case 'SHIPPED':
            return { mappedStatus: 'SHIPPING', ...STATUS_MAP.SHIPPING };
        case 'DELIVERED':
            return { mappedStatus: 'DELIVERED', ...STATUS_MAP.DELIVERED };
        case 'CANCELLED':
            return { mappedStatus: 'CANCELLED', ...STATUS_MAP.CANCELLED };
        // Các trạng thái hoàn tiền vẫn giữ statusKey là 'delivered' để hiển thị trong tab "Đã giao"
        // nhưng mappedStatus vẫn giữ nguyên để hiển thị đúng trạng thái
        case 'RETURN_REQUESTED':
            return { mappedStatus: 'RETURN_REQUESTED', ...STATUS_MAP.DELIVERED }; // Giữ key 'delivered' để hiển thị trong tab "Đã giao"
        case 'RETURN_CS_CONFIRMED':
            return { mappedStatus: 'RETURN_CS_CONFIRMED', ...STATUS_MAP.DELIVERED }; // Giữ key 'delivered'
        case 'RETURN_STAFF_CONFIRMED':
            return { mappedStatus: 'RETURN_STAFF_CONFIRMED', ...STATUS_MAP.DELIVERED }; // Giữ key 'delivered'
        case 'REFUNDED':
            return { mappedStatus: 'REFUNDED', ...STATUS_MAP.DELIVERED }; // Giữ key 'delivered'
        case 'RETURN_REJECTED':
            return { mappedStatus: 'RETURN_REJECTED', ...STATUS_MAP.DELIVERED }; // Giữ key 'delivered'
        default:
            return { mappedStatus: 'PENDING', ...STATUS_MAP.PENDING };
    }
};

// Chuyển dữ liệu đơn hàng từ API sang dạng dùng trong UI khách hàng
const buildRefundSummary = (order) => {
    if (!order) return null;
    const productValue =
        order.items?.reduce(
            (sum, item) => sum + (Number(item.unitPrice || item.price || 0) * (item.quantity || 1)),
            0,
        ) || 0;
    const shippingFee = order.shippingFee || 0;
    const totalPaid = order.refundTotalPaid ?? order.totalAmount ?? productValue + shippingFee;
    const secondShippingFee = Math.max(0, order.refundSecondShippingFee ?? 0);
    const returnPenalty = Math.max(0, order.refundPenaltyAmount ?? 0);
    const total = order.refundConfirmedAmount ?? order.refundAmount ?? totalPaid;

    return { totalPaid, productValue, shippingFee, secondShippingFee, returnPenalty, total };
};

const mapOrderFromApi = (order) => {
    if (!order) {
        console.warn('CustomerOrderHistory: mapOrderFromApi nhận order null/undefined');
        return null;
    }
    
    // Log để debug
    console.log('CustomerOrderHistory: mapOrderFromApi - Raw order:', {
        id: order.id,
        code: order.code,
        orderCode: order.orderCode,
        status: order.status,
        items: order.items?.length || 0,
        totalAmount: order.totalAmount
    });
    
    // Đảm bảo có ít nhất id hoặc code
    if (!order.id && !order.code && !order.orderCode) {
        console.warn('CustomerOrderHistory: Order không có id hoặc code:', order);
        return null;
    }
    
    const { mappedStatus, key } = mapOrderStatus(order.status);
    const shippingInfo = parseShippingInfo(order.shippingAddress);
    const orderDateValue = order.orderDateTime || order.orderDate || order.createdAt || null;
    const refundSummary = buildRefundSummary(order);

    const mapped = {
        id: order.id || order.code || order.orderCode || '',
        code: order.code || order.orderCode || order.id || '',
        orderDate: orderDateValue,
        orderDateOnly: order.orderDate || (orderDateValue ? new Date(orderDateValue).toISOString().split('T')[0] : null),
        totalAmount: typeof order.totalAmount === 'number' ? order.totalAmount : 0,
        status: mappedStatus,
        rawStatus: order.status || mappedStatus,
        statusKey: key,
        recipient:
            order.receiverName ||
            shippingInfo?.name ||
            order.customerName ||
            'Khách hàng',
        phone: order.receiverPhone || shippingInfo?.phone || '',
        address: shippingInfo?.address || '',
        items: Array.isArray(order.items) ? order.items : [],
        refundRejectionReason: order.refundRejectionReason || '',
        refundSummary,
    };
    
    return mapped;
};

function OrderHistoryPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const [orders, setOrders] = useState([]);
    const [orderThumbnails, setOrderThumbnails] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Lấy lịch sử đơn hàng thật từ backend (/orders/my-orders)
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                setError('');

                console.log('CustomerOrderHistory: Đang tải lịch sử đơn hàng...');
                
                // Sử dụng orderService thay vì fetch trực tiếp
                const data = await orderService.getMyOrders();
                
                console.log('CustomerOrderHistory: Dữ liệu từ API:', data);
                
                // orderService.getMyOrders() đã trả về data.result hoặc []
                const list = Array.isArray(data) ? data : [];
                
                console.log('CustomerOrderHistory: Số lượng đơn hàng:', list.length);
                
                if (list.length === 0) {
                    console.warn('CustomerOrderHistory: Không có đơn hàng nào được trả về từ API');
                }
                
                const mapped = list
                    .map((order, index) => {
                        try {
                            const mappedOrder = mapOrderFromApi(order);
                            if (mappedOrder) {
                                console.log(`CustomerOrderHistory: Mapped order ${index + 1}:`, {
                                    id: mappedOrder.id,
                                    code: mappedOrder.code,
                                    status: mappedOrder.status,
                                    rawStatus: mappedOrder.rawStatus
                                });
                            }
                            return mappedOrder;
                        } catch (mapErr) {
                            console.error(`CustomerOrderHistory: Lỗi khi map order ${index}:`, mapErr, order);
                            return null;
                        }
                    })
                    .filter(Boolean);
                
                console.log('CustomerOrderHistory: Số lượng đơn hàng sau khi map:', mapped.length);
                setOrders(mapped);
            } catch (err) {
                console.error('CustomerOrderHistory: Lỗi khi tải lịch sử đơn hàng:', err);
                setError(`Không thể tải lịch sử đơn hàng từ server: ${err.message || 'Lỗi không xác định'}. Vui lòng thử lại sau.`);
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    // Sau khi đã có danh sách orders, gọi thêm API chi tiết để lấy ảnh sản phẩm đầu tiên của từng đơn
    useEffect(() => {
        const apiBaseUrl = getApiBaseUrl();

        const fetchThumbnails = async () => {
            try {
                const token = getStoredToken('token');
                if (!token) return;

                const targets = orders.filter(
                    (o) => o.id && !orderThumbnails[o.id],
                );
                if (targets.length === 0) return;

                const headers = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                };

                const results = await Promise.all(
                    targets.map(async (order) => {
                        try {
                            const resp = await fetch(
                                `${apiBaseUrl}/orders/${order.id}`,
                                { headers },
                            );
                            if (!resp.ok) return null;
                            const data = await resp.json().catch(() => ({}));
                            const detail = data?.result || data || {};
                            const items = Array.isArray(detail.items)
                                ? detail.items
                                : [];
                            if (!items.length) return null;
                            const firstItem = items[0];
                            const image =
                                firstItem.image ||
                                firstItem.imageUrl ||
                                defaultProductImage;
                            const name = firstItem.name || 'Sản phẩm';
                            return {
                                orderId: order.id,
                                image,
                                name,
                                count: items.length,
                            };
                        } catch {
                            return null;
                        }
                    }),
                );

                const nextMap = {};
                results.forEach((r) => {
                    if (!r) return;
                    nextMap[r.orderId] = {
                        image: r.image,
                        name: r.name,
                        count: r.count,
                    };
                });

                if (Object.keys(nextMap).length > 0) {
                    setOrderThumbnails((prev) => ({ ...prev, ...nextMap }));
                }
            } catch {
                // ignore thumbnail errors, không chặn trang
            }
        };

        if (orders.length > 0) {
            fetchThumbnails();
        }
    }, [orders, orderThumbnails]);

    // Filter orders based on active tab
    const filteredOrders = useMemo(() => {
        console.log('CustomerOrderHistory: Filtering orders - activeTab:', activeTab, 'total orders:', orders.length);
        
        let list = [];

        // Tab "Hoàn tiền/ trả hàng" hiển thị toàn bộ đơn trong luồng hoàn tiền:
        // RETURN_REQUESTED, RETURN_CS_CONFIRMED, RETURN_STAFF_CONFIRMED, REFUNDED, RETURN_REJECTED
        if (activeTab === 'return-requested') {
            list = orders.filter((order) => {
                const status = String(order.rawStatus || order.status || '').trim().toUpperCase();
                const matches = (
                    order.statusKey === 'return-requested' ||
                    order.statusKey === 'return-rejected' ||
                    order.statusKey === 'refunded' ||
                    status === 'RETURN_REQUESTED' ||
                    status === 'RETURN_CS_CONFIRMED' ||
                    status === 'RETURN_STAFF_CONFIRMED' ||
                    status === 'REFUNDED' ||
                    status === 'RETURN_REJECTED'
                );
                if (!matches && (status === 'RETURN_CS_CONFIRMED' || status === 'RETURN_STAFF_CONFIRMED')) {
                    console.log('CustomerOrderHistory: Order not matched in return-requested tab:', {
                        code: order.code,
                        status,
                        statusKey: order.statusKey,
                        rawStatus: order.rawStatus
                    });
                }
                return matches;
            });
        } else {
            list = orders.filter((order) => {
                // Kiểm tra statusKey trước (cách chính)
                if (order.statusKey === activeTab) {
                    return true;
                }
                
                // Fallback: nếu statusKey không khớp, kiểm tra rawStatus trực tiếp
                // Điều này giúp xử lý trường hợp statusKey không được set đúng
                const rawStatus = String(order.rawStatus || order.status || '').trim().toUpperCase();
                const statusKeyFromRaw = mapOrderStatus(rawStatus).key;
                
                if (statusKeyFromRaw === activeTab) {
                    // Nếu rawStatus khớp nhưng statusKey không khớp, có thể có lỗi trong mapping
                    // Log để debug và vẫn hiển thị đơn hàng
                    if (order.statusKey !== activeTab && activeTab === 'delivered') {
                        console.warn('CustomerOrderHistory: DELIVERED/REFUND order has mismatched statusKey:', {
                            code: order.code,
                            rawStatus: rawStatus,
                            expectedStatusKey: 'delivered',
                            actualStatusKey: order.statusKey,
                            recalculatedStatusKey: statusKeyFromRaw
                        });
                    }
                    return true;
                }
                
                return false;
            });
        }
        
        console.log('CustomerOrderHistory: Sau khi filter theo tab:', list.length, 'orders');

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter((order) => {
                const matchesCode = order.code?.toLowerCase().includes(query);
                const matchesItems =
                    Array.isArray(order.items) &&
                    order.items.some((item) => item.name?.toLowerCase().includes(query));
                return matchesCode || matchesItems;
            });
        }

        // Date filter
        if (selectedDate) {
            list = list.filter((order) => {
                const base = order.orderDateOnly || order.orderDate;
                if (!base) return false;
                try {
                    return String(base).substring(0, 10) === selectedDate;
                } catch {
                    return false;
                }
            });
        }

        // Sort
        list = [...list].sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.orderDate || 0) - new Date(a.orderDate || 0);
                case 'oldest':
                    return new Date(a.orderDate || 0) - new Date(b.orderDate || 0);
                case 'price-high':
                    return (b.totalAmount || 0) - (a.totalAmount || 0);
                case 'price-low':
                    return (a.totalAmount || 0) - (b.totalAmount || 0);
                default:
                    return 0;
            }
        });

        return list;
    }, [orders, activeTab, searchQuery, selectedDate, sortBy]);

    const handleViewDetail = (orderId, orderCode, orderStatus) => {
        // Use orderId if available, otherwise fallback to orderCode
        const targetId = orderId || orderCode;
        if (!targetId) {
            console.error('CustomerOrderHistory: Cannot navigate - missing order ID and code');
            return;
        }
        
        // Nếu đơn hàng có trạng thái refund, điều hướng đến trang refund-detail
        const status = String(orderStatus || '').trim().toUpperCase();
        if (status === 'RETURN_REQUESTED' || 
            status === 'RETURN_CS_CONFIRMED' || 
            status === 'RETURN_STAFF_CONFIRMED' || 
            status === 'REFUNDED' || 
            status === 'RETURN_REJECTED') {
            console.log('CustomerOrderHistory: Navigating to refund detail with id/code:', targetId);
            navigate(`/customer-account/orders/${targetId}/refund-detail`);
        } else {
            console.log('CustomerOrderHistory: Navigating to order detail with id/code:', targetId);
            navigate(`/customer-account/orders/${targetId}`);
        }
    };

    const formatOrderDate = (dateString) => {
        if (!dateString) return '--';
        try {
            const date = new Date(dateString);
            if (Number.isNaN(date.getTime())) return dateString;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hasTime =
                (typeof dateString === 'string' && dateString.includes('T')) ||
                date.getHours() !== 0 ||
                date.getMinutes() !== 0 ||
                date.getSeconds() !== 0;
            if (!hasTime) {
                return `${day}/${month}/${year}`;
            }
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            return `${hour}:${minute} ${day}/${month}/${year}`;
        } catch {
            return dateString;
        }
    };

    return (
        <div className={cx('order-history-wrapper')}>
            <div className={cx('order-history-content')}>
                <main className={cx('order-history-main')}>
                    {/* Header */}
                    <section className={cx('header-section')}>
                        <div className={cx('header-title')}>
                            <div className={cx('header-icon-placeholder')} />
                            <h1>Lịch sử mua hàng</h1>
                        </div>
                    </section>

                    {/* Tabs */}
                    <section className={cx('tabs-section')}>
                        <div className={cx('tabs')}>
                            {TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    className={cx('tab', { active: activeTab === tab.key })}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Search and Filter */}
                    <section className={cx('filter-section')}>
                        <div className={cx('filter-row')}>
                            <input
                                type="text"
                                className={cx('search-input')}
                                placeholder="Tìm kiếm theo mã đơn, tên sản phẩm,......"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className={cx('date-input-wrapper')}>
                                <input
                                    type="date"
                                    className={cx('date-input')}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    placeholder="dd/mm/yyyy"
                                />
                                <span className={cx('calendar-icon')}>📅</span>
                            </div>
                            <button className={cx('search-btn')}>Tìm kiếm</button>
                            <div className={cx('sort-wrapper')}>
                                <span className={cx('sort-label')}>Sắp xếp:</span>
                                <select
                                    className={cx('sort-select')}
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    {SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Orders List */}
                    <section className={cx('orders-section')}>
                        {loading ? (
                            <div className={cx('empty-state')}>
                                <p>Đang tải lịch sử đơn hàng...</p>
                            </div>
                        ) : error ? (
                            <div className={cx('empty-state')}>
                                <p>{error}</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className={cx('empty-state')}>
                                <p>Không có đơn hàng nào</p>
                            </div>
                        ) : (
                            <div className={cx('orders-list')}>
                                {filteredOrders.map((order) => {
                                    // Nếu order có rawStatus là RETURN_REQUESTED, REFUNDED, hoặc RETURN_REJECTED,
                                    // thì hiển thị status đó thay vì status mapped
                                    let displayStatus = order.status;
                                    if (order.rawStatus === 'RETURN_REQUESTED' ||
                                        order.rawStatus === 'REFUNDED' ||
                                        order.rawStatus === 'RETURN_REJECTED') {
                                        displayStatus = order.rawStatus;
                                    }
                                    const statusInfo = STATUS_MAP[displayStatus] || STATUS_MAP.PENDING;
                                    const thumb = orderThumbnails[order.id];
                                    const hasThumb = !!thumb;
                                    const firstItemImage = thumb?.image || defaultProductImage;
                                    const firstItemName = thumb?.name || 'Sản phẩm';

                                    return (
                                        <div key={order.id} className={cx('order-card')}>
                                            <div className={cx('order-header')}>
                                                <div className={cx('order-info')}>
                                                    <h3 className={cx('order-code')}>
                                                        Đơn hàng #{order.code}
                                                    </h3>
                                                    <p className={cx('order-date')}>
                                                        Ngày đặt: {formatOrderDate(order.orderDate)}
                                                    </p>
                                                    {hasThumb && (
                                                        <div className={cx('order-thumb')}>
                                                            <img
                                                                src={firstItemImage}
                                                                alt={firstItemName}
                                                                className={cx('order-thumb-image')}
                                                            />
                                                            {thumb.count > 1 && (
                                                                <span className={cx('order-thumb-count')}>
                                                                    +{thumb.count - 1} sản phẩm khác
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={cx('order-status-wrapper')}>
                                                    <button
                                                        className={cx('status-badge', statusInfo.key)}
                                                    >
                                                        {statusInfo.label}
                                                    </button>
                                                    <p className={cx('order-total')}>
                                                        {formatCurrency(
                                                            order.refundSummary?.total ??
                                                                order.totalAmount,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {Array.isArray(order.items) && order.items.length > 0 && (
                                                <div className={cx('order-items')}>
                                                    {order.items.map((item) => (
                                                        <div key={item.id} className={cx('order-item')}>
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                className={cx('item-image')}
                                                            />
                                                            <div className={cx('item-info')}>
                                                                <p className={cx('item-name')}>
                                                                    {item.name}
                                                                </p>
                                                                <p className={cx('item-quantity')}>
                                                                    Số lượng: {item.quantity}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className={cx('order-actions')}>
                                                <button
                                                    className={cx('view-detail-btn')}
                                                    onClick={() => handleViewDetail(order.id, order.code, order.rawStatus || order.status)}
                                                >
                                                    Xem chi tiết
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
}

export default OrderHistoryPage;
