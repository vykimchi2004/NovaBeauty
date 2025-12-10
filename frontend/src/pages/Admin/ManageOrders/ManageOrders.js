import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ManageOrders.module.scss';
import { formatDateTime } from '~/services/utils';
import orderService from '~/services/order';

const cx = classNames.bind(styles);

const mapOrderStatus = (statusRaw) => {
    const status = String(statusRaw || '').toUpperCase();
    switch (status) {
        case 'CREATED':
        case 'PENDING':
            return { label: 'Chờ xác nhận', css: 'pending' };
        case 'CONFIRMED':
        case 'PAID':
            return { label: 'Đang xử lý', css: 'processing' };
        case 'SHIPPED':
            return { label: 'Đang giao', css: 'shipping' };
        case 'DELIVERED':
            return { label: 'Đã giao', css: 'delivered' };
        case 'CANCELLED':
            return { label: 'Đã hủy', css: 'cancelled' };
        case 'RETURN_REQUESTED':
            return { label: 'Khách hàng yêu cầu hoàn tiền/ trả hàng', css: 'return-requested' };
        case 'RETURN_CS_CONFIRMED':
            return { label: 'CSKH đã xác nhận', css: 'return-requested' };
        case 'RETURN_STAFF_CONFIRMED':
            return { label: 'Nhân viên đã xác nhận hàng', css: 'processing' };
        case 'REFUNDED':
            return { label: 'Hoàn tiền thành công', css: 'refunded' };
        case 'RETURN_REJECTED':
            return { label: 'Từ chối hoàn tiền/ trả hàng', css: 'return-rejected' };
        default:
            return { label: statusRaw || 'Chờ xác nhận', css: 'pending' };
    }
};

const REFUND_STATUS_SET = new Set([
    'RETURN_REQUESTED',
    'RETURN_CS_CONFIRMED',
    'RETURN_STAFF_CONFIRMED',
    'REFUNDED',
    'RETURN_REJECTED',
]);

const isRefundOrder = (order) => REFUND_STATUS_SET.has(String(order?.rawStatus || order?.status || '').toUpperCase());

const STATUS_FILTERS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'pending', label: 'Chờ xác nhận' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'shipping', label: 'Đang giao' },
    { value: 'delivered', label: 'Đã giao' },
    { value: 'cancelled', label: 'Đã hủy' },
];

const REFUND_STATUS_FILTERS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'return-requested', label: 'Khách hàng yêu cầu hoàn tiền/ trả hàng' },
    { value: 'return-cs', label: 'CSKH đã xác nhận' },
    { value: 'return-staff', label: 'Nhân viên đã xác nhận hàng' },
    { value: 'refunded', label: 'Hoàn tiền thành công' },
    { value: 'return-rejected', label: 'Từ chối' },
];

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

const formatPrice = (value) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(typeof value === 'number' ? value : Number(value) || 0);

// Format currency with dot separator (180.000 instead of 180,000₫)
const formatCurrencyWithDot = (amount) => {
    if (!amount && amount !== 0) return '0';
    return new Intl.NumberFormat('vi-VN', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace(/,/g, '.');
};

const toNumber = (value, fallback = 0) => {
    if (value == null) return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const buildRefundSummary = (order) => {
    if (!order) {
        return {
            totalPaid: 0,
            productValue: 0,
            shippingFee: 0,
            secondShippingFee: 0,
            returnPenalty: 0,
            total: 0,
            confirmedTotal: 0,
        };
    }

    const shippingFee = toNumber(order.shippingFee);
    const totalPaid = toNumber(order.refundTotalPaid) || toNumber(order.totalAmount) || 0;
    
    // Tính giá trị sản phẩm ban đầu (chưa có voucher)
    const rawProductValue = toNumber(order.refundProductValue) || 
        toNumber(order.selectedItemsTotal) || 
        0;
    
    // Nếu có voucher (totalPaid khác với rawProductValue + shippingFee), 
    // thì giá trị sản phẩm = totalPaid - shippingFee
    // Nếu không có voucher, giữ nguyên giá trị sản phẩm ban đầu
    const productValue = totalPaid > 0 && rawProductValue > 0 && Math.abs(totalPaid - (rawProductValue + shippingFee)) > 0.01
        ? Math.max(0, totalPaid - shippingFee)
        : (rawProductValue > 0 ? rawProductValue : Math.max(0, totalPaid - shippingFee));

    const secondShippingFee = Math.max(
        0,
        Math.round(
            toNumber(order.refundSecondShippingFee) ||
                toNumber(order.refundReturnFee) ||
                toNumber(order.estimatedReturnShippingFee) ||
                toNumber(order.shippingFee),
        ),
    );

    const returnPenalty = toNumber(order.refundPenaltyAmount);
    const reason = (order.refundReasonType || '').toLowerCase();
    const fallbackTotal =
        reason === 'store'
            ? totalPaid + secondShippingFee
            : Math.max(0, totalPaid - secondShippingFee - returnPenalty);

    let total = order.refundAmount != null ? Number(order.refundAmount) : fallbackTotal;
    if (!Number.isFinite(total)) {
        total = fallbackTotal;
    }

    const confirmedTotal =
        order.refundConfirmedAmount != null && Number.isFinite(Number(order.refundConfirmedAmount))
            ? Number(order.refundConfirmedAmount)
            : total;

    return {
        totalPaid,
        productValue,
        shippingFee,
        secondShippingFee,
        returnPenalty,
        total,
        confirmedTotal,
    };
};

// Format date as YYYY-MM-DD
const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    } catch {
        return dateString;
    }
};

const ITEMS_PER_PAGE = 8;

const getOrderDateValue = (order) => {
    if (!order) return null;
    return order.orderDateTime || order.orderDate || order.createdAt || null;
};

const mapOrderFromApi = (order) => {
    if (!order) {
        console.warn('⚠️ mapOrderFromApi: order is null/undefined');
        return null;
    }
    
    const rawStatus = order.status || order.rawStatus || 'CREATED';
    const { label, css } = mapOrderStatus(rawStatus);
    const shippingInfo = parseShippingInfo(order.shippingAddress);
    const orderDate = getOrderDateValue(order);
    const refundSummary = buildRefundSummary(order);
    const totalAmount =
        typeof order.totalAmount === 'number' ? order.totalAmount : Number(order.totalAmount) || 0;
    const returnCheckedDate = order.returnCheckedDate || order.returnDate || null;

    const mapped = {
        id: order.id || '',
        code: order.code || order.orderCode || order.id || '',
        customerName:
            order.receiverName ||
            shippingInfo?.name ||
            order.customerName ||
            order.userFullName ||
            'Khách hàng',
        email: order.customerEmail || order.userEmail || '',
        orderDate,
        orderDateOnly: order.orderDate || null,
        totalAmount,
        statusLabel: label,
        statusClass: css,
        rawStatus: rawStatus || 'CREATED',
        refundSummary,
        refundDisplayTotal: refundSummary.confirmedTotal ?? refundSummary.total ?? totalAmount,
        returnCheckedDate,
    };
    
    return mapped;
};

function ManageOrders() {
    const navigate = useNavigate();
    const location = useLocation();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [refundSearchTerm, setRefundSearchTerm] = useState('');
    const [refundStatusFilter, setRefundStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('orders');

    // Nhận state từ location để set activeTab khi quay về từ OrderDetailPage
    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
            // Xóa state để tránh set lại khi component re-render
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);
    const [currentPage, setCurrentPage] = useState(1);
    const [refundCurrentPage, setRefundCurrentPage] = useState(1);

    const fetchOrders = useMemo(
        () => async () => {
            try {
                setLoading(true);
                setError('');
                const data = await orderService.getAllOrders();
                const list = Array.isArray(data) ? data : [];
                const mapped = list.map(mapOrderFromApi).filter(Boolean);
                setOrders(mapped);
            } catch (err) {
                console.error('ManageOrders: load orders failed', err);
                setOrders([]);
                setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedDate, statusFilter]);

    useEffect(() => {
        setRefundCurrentPage(1);
    }, [refundSearchTerm, refundStatusFilter]);

    // Filter orders - exclude return/refund orders from main table
    const filteredOrders = useMemo(() => {
        let list = orders.filter((order) => !isRefundOrder(order));

        if (searchTerm.trim()) {
            const query = searchTerm.trim().toLowerCase();
            list = list.filter((order) => {
                return (
                    order.code?.toLowerCase().includes(query) ||
                    order.customerName?.toLowerCase().includes(query) ||
                    order.email?.toLowerCase().includes(query)
                );
            });
        }

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

        if (statusFilter !== 'all') {
            list = list.filter((order) => order.statusClass === statusFilter);
        }

        return [...list].sort((a, b) => {
            const da = a.orderDate ? new Date(a.orderDate) : 0;
            const db = b.orderDate ? new Date(b.orderDate) : 0;
            return db - da;
        });
    }, [orders, searchTerm, selectedDate, statusFilter]);

    const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)) || 1;

    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredOrders, currentPage]);

    const refundEligibleOrders = useMemo(() => {
        let list = orders.filter((order) => {
            if (!isRefundOrder(order)) return false;
            return true;
        });

        // Apply search filter if needed
        if (refundSearchTerm.trim()) {
            const query = refundSearchTerm.trim().toLowerCase();
            list = list.filter((order) => {
                return (
                    order.code?.toLowerCase().includes(query) ||
                    order.customerName?.toLowerCase().includes(query)
                );
            });
        }

        if (refundStatusFilter !== 'all') {
            list = list.filter((order) => {
                const status = (order.rawStatus || '').toUpperCase();
                if (refundStatusFilter === 'return-requested') {
                    return status === 'RETURN_REQUESTED';
                }
                if (refundStatusFilter === 'return-cs') {
                    return status === 'RETURN_CS_CONFIRMED';
                }
                if (refundStatusFilter === 'return-staff') {
                    return status === 'RETURN_STAFF_CONFIRMED';
                }
                if (refundStatusFilter === 'refunded') {
                    return status === 'REFUNDED';
                }
                if (refundStatusFilter === 'return-rejected') {
                    return status === 'RETURN_REJECTED';
                }
                return true;
            });
        }

        return [...list].sort((a, b) => {
            const da = a.orderDate ? new Date(a.orderDate) : 0;
            const db = b.orderDate ? new Date(b.orderDate) : 0;
            return db - da;
        });
    }, [orders, refundSearchTerm, refundStatusFilter]);

    useEffect(() => {
        if (currentPage > totalOrderPages) {
            setCurrentPage(totalOrderPages);
        }
    }, [currentPage, totalOrderPages]);

    const totalRefundPages = Math.max(1, Math.ceil(refundEligibleOrders.length / ITEMS_PER_PAGE)) || 1;

    const paginatedRefundOrders = useMemo(() => {
        const start = (refundCurrentPage - 1) * ITEMS_PER_PAGE;
        return refundEligibleOrders.slice(start, start + ITEMS_PER_PAGE);
    }, [refundEligibleOrders, refundCurrentPage]);

    useEffect(() => {
        if (refundCurrentPage > totalRefundPages) {
            setRefundCurrentPage(totalRefundPages);
        }
    }, [refundCurrentPage, totalRefundPages]);

    const renderPagination = (page, totalPages, handlePrev, handleNext) => {
        if (totalPages <= 1) return null;
        return (
            <div className={cx('pagination')}>
                <button
                    type="button"
                    className={cx('paginationBtn')}
                    disabled={page === 1}
                    onClick={handlePrev}
                >
                    Trước
                </button>
                <span className={cx('paginationInfo')}>
                    Trang {page}/{totalPages}
                </span>
                <button
                    type="button"
                    className={cx('paginationBtn')}
                    disabled={page === totalPages}
                    onClick={handleNext}
                >
                    Tiếp
                </button>
            </div>
        );
    };

    const handleViewDetail = (orderId) => {
        if (!orderId) return;
        navigate(`/admin/orders/${orderId}`, { state: { fromTab: activeTab } });
    };

    return (
        <div className={cx('page')}>
            <div className={cx('header')}>
                <h1>Quản lý đơn hàng</h1>
            </div>

            <div className={cx('tabs')}>
                <button
                    type="button"
                    className={cx('tab', { active: activeTab === 'orders' })}
                    onClick={() => setActiveTab('orders')}
                >
                    Quản lý đơn hàng
                </button>
                <button
                    type="button"
                    className={cx('tab', { active: activeTab === 'refunds' })}
                    onClick={() => setActiveTab('refunds')}
                >
                    Quản lý đơn hoàn về
                </button>
            </div>

            {activeTab === 'orders' ? (
                <>
                    <form
                        className={cx('filters')}
                        onSubmit={(e) => {
                            e.preventDefault();
                        }}
                    >
                        <input
                            type="text"
                            className={cx('searchInput')}
                            placeholder="Tìm kiếm theo mã đơn, tên khách, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className={cx('dateInputWrapper')}>
                            <input
                                type="date"
                                className={cx('dateInput')}
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <button type="submit" className={cx('searchButton')}>
                            Tìm kiếm
                        </button>
                        <div className={cx('statusFilter')}>
                            <label htmlFor="order-status-select">Sắp xếp:</label>
                            <select
                                id="order-status-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                {STATUS_FILTERS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </form>

                    {loading ? (
                        <div className={cx('stateCard')}>Đang tải danh sách đơn hàng...</div>
                    ) : error ? (
                        <div className={cx('stateCard', 'error')}>
                            <p>{error}</p>
                            <button type="button" onClick={fetchOrders}>
                                Thử lại
                            </button>
                        </div>
                    ) : filteredOrders.length === 0 && orders.length > 0 ? (
                        <div className={cx('stateCard')}>
                            <p>Không có đơn hàng phù hợp với bộ lọc hiện tại.</p>
                            <p style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>
                                Tổng số đơn hàng: {orders.length} | Đã lọc: {filteredOrders.length}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedDate('');
                                    setStatusFilter('all');
                                }}
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className={cx('stateCard')}>
                            <p>Không có đơn hàng nào trong hệ thống.</p>
                            <p style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>
                                Tổng số đơn hàng: {orders.length}
                            </p>
                        </div>
                    ) : (
                        <>
                        <div className={cx('tableWrapper')}>
                            <table className={cx('table')}>
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Họ và tên</th>
                                        <th>Email</th>
                                        <th>Ngày đặt</th>
                                        <th>Tổng tiền</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedOrders.map((order) => (
                                        <tr key={order.id}>
                                            <td>#{order.code}</td>
                                            <td>{order.customerName}</td>
                                            <td>{order.email || '---'}</td>
                                            <td>
                                                {order.orderDate ? formatDateTime(order.orderDate) : '--'}
                                            </td>
                                            <td>{formatPrice(order.totalAmount)}</td>
                                            <td>
                                                <span className={cx('statusBadge', order.statusClass)}>
                                                    {order.statusLabel}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className={cx('detailButton')}
                                                    onClick={() => handleViewDetail(order.id)}
                                                >
                                                    Xem chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {renderPagination(
                            currentPage,
                            totalOrderPages,
                            () => setCurrentPage((prev) => Math.max(1, prev - 1)),
                            () => setCurrentPage((prev) => Math.min(totalOrderPages, prev + 1)),
                        )}
                        </>
                    )}
                </>
            ) : (
                <>
                    <div className={cx('filters')}>
                        <input
                            type="text"
                            className={cx('searchInput')}
                            placeholder="Tìm kiếm theo mã đơn, tên khách..."
                            value={refundSearchTerm}
                            onChange={(e) => setRefundSearchTerm(e.target.value)}
                        />
                        <div className={cx('statusFilter')}>
                            <label htmlFor="refund-status-select">Trạng thái:</label>
                            <select
                                id="refund-status-select"
                                value={refundStatusFilter}
                                onChange={(e) => setRefundStatusFilter(e.target.value)}
                            >
                                {REFUND_STATUS_FILTERS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className={cx('stateCard')}>Đang tải danh sách đơn hoàn về...</div>
                    ) : refundEligibleOrders.length === 0 ? (
                        <div className={cx('stateCard')}>
                            <p>Không có đơn hoàn tiền.</p>
                        </div>
                    ) : (
                        <>
                            <div className={cx('tableWrapper')}>
                                <table className={cx('table')}>
                                    <thead>
                                        <tr>
                                            <th>Mã đơn</th>
                                            <th>Khách hàng</th>
                                            <th>Tổng tiền</th>
                                            <th>Tiền hoàn</th>
                                            <th>Ngày duyệt</th>
                                            <th>Trạng thái</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedRefundOrders.map((order) => (
                                            <tr key={order.id}>
                                                <td>{order.code}</td>
                                                <td>{order.customerName}</td>
                                                <td>{formatCurrencyWithDot(order.totalAmount)}</td>
                                                <td>
                                                    {formatCurrencyWithDot(
                                                        order.refundDisplayTotal ?? order.totalAmount,
                                                    )}
                                                </td>
                                                <td>{formatDateOnly(order.returnCheckedDate || order.orderDate)}</td>
                                                <td>
                                                    <span className={cx('statusBadge', order.statusClass)}>
                                                        {order.statusLabel}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={cx('detailButton')}
                                                        onClick={() => handleViewDetail(order.id)}
                                                    >
                                                        Xem chi tiết
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {renderPagination(
                                refundCurrentPage,
                                totalRefundPages,
                                () => setRefundCurrentPage((prev) => Math.max(1, prev - 1)),
                                () => setRefundCurrentPage((prev) => Math.min(totalRefundPages, prev + 1)),
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

export default ManageOrders;
