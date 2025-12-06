import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './StaffOrderPage.module.scss';
import { useNavigate } from 'react-router-dom';
import SearchAndSort from '~/components/Common/SearchAndSort/SearchAndSort';
import CancelOrderDialog from '~/components/Common/ConfirmDialog/CancelOrderDialog';
import orderService from '~/services/order';
import { formatDateTime } from '~/services/utils';
import defaultProductImage from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

// Mapping trạng thái đơn hàng từ backend sang label & class hiển thị
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
            return { label: 'Hoàn thành', css: 'completed' };
        case 'CANCELLED':
            return { label: 'Đã hủy', css: 'cancelled' };
        case 'RETURN_REQUESTED':
            return { label: 'Khách hàng yêu cầu hoàn tiền/ trả hàng', css: 'return-requested' };
        case 'RETURN_CS_CONFIRMED':
            return { label: 'Chờ nhân viên xác nhận hàng', css: 'return-requested' };
        case 'RETURN_STAFF_CONFIRMED':
            return { label: 'Chờ Admin hoàn tiền', css: 'processing' };
        case 'REFUNDED':
            return { label: 'Hoàn tiền thành công', css: 'refunded' };
        case 'RETURN_REJECTED':
            return { label: 'Từ chối', css: 'return-rejected' };
        default:
            return { label: statusRaw || 'Chờ xác nhận', css: 'pending' };
    }
};

// Kiểm tra xem đơn hàng có phải là đơn hoàn về không
const isRefundOrder = (order) => {
    const status = String(order?.rawStatus || order?.status || '').toUpperCase();
    return (
        status === 'RETURN_REQUESTED' ||
        status === 'RETURN_CS_CONFIRMED' ||
        status === 'RETURN_STAFF_CONFIRMED' ||
        status === 'REFUNDED' ||
        status === 'RETURN_REJECTED'
    );
};

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

// Chuyển đổi dữ liệu đơn hàng từ API sang dạng hiển thị
const getOrderDateValue = (order) => {
    if (!order) return null;
    return order.orderDateTime || order.orderDate || order.createdAt || null;
};

const mapOrderFromApi = (order) => {
    if (!order) return null;
    const rawStatus = order.status || order.rawStatus;
    const { label, css } = mapOrderStatus(rawStatus);
    const shippingInfo = parseShippingInfo(order.shippingAddress);
    const orderDateValue = getOrderDateValue(order);

    // Tính refund amount (nếu có)
    const refundAmount = order.refundAmount ||
        (order.totalAmount && order.refundReturnFee
            ? order.totalAmount - (order.refundReturnFee || 0)
            : order.totalAmount || 0);

    return {
        id: order.id || '',
        code: order.code || order.orderCode || order.id || '',
        username:
            order.receiverName ||
            shippingInfo?.name ||
            order.customerName ||
            'Khách hàng',
        phoneDisplay: order.receiverPhone || shippingInfo?.phone || '',
        email: order.customerEmail || '',
        orderDate: orderDateValue,
        orderDateOnly: order.orderDate || null,
        totalAmount: typeof order.totalAmount === 'number' ? order.totalAmount : 0,
        refundAmount: typeof refundAmount === 'number' ? refundAmount : 0,
        receivedDate: order.orderDate || orderDateValue, // Ngày nhận hàng (dùng orderDate tạm thời)
        rawStatus: rawStatus,
        statusLabel: label,
        statusClass: css,
    };
};

// Format ngày giờ hiển thị cho bảng đơn hàng: "HH:mm dd/MM/yyyy"
const formatOrderDateTime = (value) => {
    if (!value) return '--';
    try {
        const raw = typeof value === 'string' ? value.trim() : value;
        const hasExplicitTime =
            typeof raw === 'string' &&
            (raw.includes('T') || /\d{2}:\d{2}/.test(raw));

        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return '--';

        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = String(d.getFullYear());
        const datePart = `${dd}/${mm}/${yyyy}`;

        if (!hasExplicitTime) {
            return datePart;
        }

        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mi} ${datePart}`;
    } catch {
        // fallback: dùng formatDateTime chung nếu có lỗi bất ngờ
        return formatDateTime(value);
    }
};

export default function StaffOrderPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [cancelDialogOrderId, setCancelDialogOrderId] = useState(null);
    const [actionMessage, setActionMessage] = useState('');
    const [processingOrderId, setProcessingOrderId] = useState(null);

    // Filters cho phần Quản lý đơn hàng
    const [keyword, setKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Filters cho phần Quản lý đơn hoàn về
    const [refundKeyword, setRefundKeyword] = useState('');
    const [debouncedRefundKeyword, setDebouncedRefundKeyword] = useState('');
    const [refundDateFilter, setRefundDateFilter] = useState('');
    const [refundStatusFilter, setRefundStatusFilter] = useState('all');
    const [refundCurrentPage, setRefundCurrentPage] = useState(1);
    const refundItemsPerPage = 8;
    const [activeTab, setActiveTab] = useState('orders');
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [orderDetails, setOrderDetails] = useState({});

    // Debounce keyword để tránh filter + sort với list lớn trên mỗi lần gõ phím
    useEffect(() => {
        const id = setTimeout(() => {
            setDebouncedKeyword(keyword.trim());
        }, 300);
        return () => clearTimeout(id);
    }, [keyword]);

    useEffect(() => {
        const id = setTimeout(() => {
            setDebouncedRefundKeyword(refundKeyword.trim());
        }, 300);
        return () => clearTimeout(id);
    }, [refundKeyword]);

    // Fetch danh sách đơn hàng
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                setError('');
                setActionError('');
                setActionMessage('');

                const data = await orderService.getAllOrders();
                const list = Array.isArray(data) ? data : [];
                const mapped = list
                    .map(mapOrderFromApi)
                    .filter(Boolean);
                setOrders(mapped.length > 0 ? mapped : []);
            } catch (err) {
                console.error('StaffOrder: Lỗi khi tải đơn hàng:', err);
                setError('Không thể tải danh sách đơn hàng từ server. Vui lòng thử lại sau.');
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    // Tách orders thành 2 nhóm: normal orders và refund orders
    const { normalOrders, refundOrders } = useMemo(() => {
        const normal = [];
        const refund = [];

        orders.forEach((order) => {
            if (isRefundOrder(order)) {
                const status = String(order?.rawStatus || order?.status || '').trim().toUpperCase();
                // Thêm vào refundOrders nếu là RETURN_CS_CONFIRMED hoặc RETURN_STAFF_CONFIRMED hoặc RETURN_REJECTED
                if (status === 'RETURN_CS_CONFIRMED' ||
                    status === 'RETURN_STAFF_CONFIRMED' ||
                    status === 'RETURN_REJECTED') {
                    refund.push(order);
                }
            } else {
                normal.push(order);
            }
        });
        return { normalOrders: normal, refundOrders: refund };
    }, [orders]);

    // Lọc đơn hàng thông thường theo ô tìm kiếm, ngày và trạng thái
    const filteredOrders = useMemo(() => {
        if (activeTab !== 'orders') {
            return normalOrders;
        }

        let result = normalOrders;

        if (debouncedKeyword) {
            const kw = debouncedKeyword.toLowerCase();
            result = result.filter((o) => {
                return (
                    o.code?.toLowerCase().includes(kw) ||
                    o.username?.toLowerCase().includes(kw) ||
                    o.email?.toLowerCase().includes(kw)
                );
            });
        }

        if (dateFilter) {
            result = result.filter((o) => {
                const base = o.orderDateOnly || o.orderDate;
                if (!base) return false;
                try {
                    const orderDateStr =
                        typeof base === 'string'
                            ? base.substring(0, 10)
                            : new Date(base).toISOString().substring(0, 10);
                    return orderDateStr === dateFilter;
                } catch {
                    return false;
                }
            });
        }

        if (statusFilter !== 'all') {
            result = result.filter((o) => {
                const mapped = mapOrderStatus(o.rawStatus || o.status);
                return mapped.css === statusFilter;
            });
        }

        // Sắp xếp mới nhất lên trước theo ngày đặt
        return [...result].sort((a, b) => {
            const da = a.orderDate ? new Date(a.orderDate) : 0;
            const db = b.orderDate ? new Date(b.orderDate) : 0;
            return db - da;
        });
    }, [normalOrders, debouncedKeyword, dateFilter, statusFilter, activeTab]);

    // Tính toán pagination cho đơn hàng thông thường
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    // Reset về trang 1 khi filter thay đổi
    useEffect(() => {
        if (activeTab === 'orders') {
            setCurrentPage(1);
        }
    }, [debouncedKeyword, dateFilter, statusFilter, activeTab]);

    // Lọc đơn hoàn về theo ô tìm kiếm, ngày và trạng thái
    const filteredRefundOrders = useMemo(() => {
        if (activeTab !== 'refunds') {
            return refundOrders;
        }

        let result = refundOrders;

        if (debouncedRefundKeyword) {
            const kw = debouncedRefundKeyword.toLowerCase();
            result = result.filter((o) => {
                return (
                    o.code?.toLowerCase().includes(kw) ||
                    o.username?.toLowerCase().includes(kw) ||
                    o.email?.toLowerCase().includes(kw)
                );
            });
        }

        if (refundDateFilter) {
            result = result.filter((o) => {
                const base = o.orderDateOnly || o.orderDate;
                if (!base) return false;
                try {
                    const orderDateStr =
                        typeof base === 'string'
                            ? base.substring(0, 10)
                            : new Date(base).toISOString().substring(0, 10);
                    return orderDateStr === refundDateFilter;
                } catch {
                    return false;
                }
            });
        }

        if (refundStatusFilter !== 'all') {
            result = result.filter((o) => {
                const status = String(o.rawStatus || o.status || '').toUpperCase();
                if (refundStatusFilter === 'return-cs') {
                    return status === 'RETURN_CS_CONFIRMED';
                } else if (refundStatusFilter === 'return-staff') {
                    return status === 'RETURN_STAFF_CONFIRMED';
                } else if (refundStatusFilter === 'return-rejected') {
                    return status === 'RETURN_REJECTED';
                }
                return true;
            });
        }

        // Sắp xếp mới nhất lên trước theo ngày đặt
        return [...result].sort((a, b) => {
            const da = a.orderDate ? new Date(a.orderDate) : 0;
            const db = b.orderDate ? new Date(b.orderDate) : 0;
            return db - da;
        });
    }, [refundOrders, debouncedRefundKeyword, refundDateFilter, refundStatusFilter, activeTab]);

    // Tính toán pagination cho đơn hoàn về
    const refundTotalPages = Math.ceil(filteredRefundOrders.length / refundItemsPerPage);
    const refundStartIndex = (refundCurrentPage - 1) * refundItemsPerPage;
    const refundEndIndex = refundStartIndex + refundItemsPerPage;
    const paginatedRefundOrders = filteredRefundOrders.slice(refundStartIndex, refundEndIndex);

    // Reset về trang 1 khi filter thay đổi
    useEffect(() => {
        if (activeTab === 'refunds') {
            setRefundCurrentPage(1);
        }
    }, [debouncedRefundKeyword, refundDateFilter, refundStatusFilter, activeTab]);

    const renderPaginationControls = (page, total, handlePrev, handleNext) => {
        if (total <= 1) return null;
        return (
            <div className={cx('pagination')}>
                <button
                    type="button"
                    className={cx('pagination-btn')}
                    disabled={page === 1}
                    onClick={handlePrev}
                >
                    Trước
                </button>
                <span className={cx('pagination-info')}>
                    Trang {page}/{total}
                </span>
                <button
                    type="button"
                    className={cx('pagination-btn')}
                    disabled={page === total}
                    onClick={handleNext}
                >
                    Tiếp
                </button>
            </div>
        );
    };

    const handleViewDetail = async (orderId) => {
        if (!orderId) return;
        setSelectedOrderId(orderId);
        setIsDetailOpen(true);

        if (orderDetails[orderId]) return; // đã cache

        try {
            setDetailLoading(true);
            const detail = await orderService.getOrderById(orderId);
            setOrderDetails((prev) => ({ ...prev, [orderId]: detail || null }));
        } catch (err) {
            console.error('StaffOrder: lỗi khi tải chi tiết đơn hàng', err);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
        setSelectedOrderId(null);
    };

    const handleConfirmOrder = async (orderId) => {
        if (!orderId) return;

        try {
            setActionError('');
            setActionMessage('');
            setProcessingOrderId(orderId);

            const { ok, data: confirmedOrder, status } = await orderService.confirmOrder(orderId);

            if (!ok) {
                throw new Error(`Confirm API error ${status || ''}`.trim());
            }

            const mapped = mapOrderFromApi(confirmedOrder);

            if (!mapped) {
                throw new Error('Không nhận được dữ liệu đơn hàng sau khi xác nhận');
            }

            setOrders((prev) => prev.map((o) => (o.id === orderId ? mapped : o)));
            setActionMessage(`Đã xác nhận đơn #${mapped.code}.`);

            // Tạo vận đơn GHN qua endpoint mới /shipments/create/{orderId}
            try {
                const { ok: shipmentOk, status: shipmentStatus, data: shipmentData } =
                    await orderService.createShipment(orderId, {});

                if (!shipmentOk || !shipmentData) {
                    throw new Error(
                        shipmentStatus
                            ? `Không thể tạo vận đơn GHN (HTTP ${shipmentStatus})`
                            : 'Không thể tạo vận đơn GHN.',
                    );
                }

                setActionMessage(`Đã xác nhận đơn #${mapped.code} và tạo vận đơn GHN.`);
            } catch (shipmentErr) {
                console.error('StaffOrder: tạo vận đơn GHN thất bại', shipmentErr);
                setActionError(
                    shipmentErr?.message
                        ? `Không thể tạo vận đơn GHN: ${shipmentErr.message}`
                        : 'Không thể tạo vận đơn GHN. Vui lòng thử lại trong trang chi tiết đơn.',
                );
            }
        } catch (err) {
            console.error('StaffOrder: xác nhận đơn hàng thất bại', err);
            setActionError(err?.message || 'Không thể xác nhận đơn hàng. Vui lòng thử lại.');
        } finally {
            setProcessingOrderId(null);
        }
    };

    const handleCancelOrder = (orderId) => {
        if (!orderId || processingOrderId) return;
        setActionError('');
        setActionMessage('');
        setCancelDialogOrderId(orderId);
    };

    const handleConfirmCancelOrder = async (reason) => {
        const orderId = cancelDialogOrderId;
        if (!orderId) return;
        try {
            setProcessingOrderId(orderId);
            const { ok } = await orderService.cancelOrder(orderId, reason);
            if (!ok) {
                setActionError('Không thể hủy đơn hàng. Vui lòng thử lại.');
                return;
            }
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? {
                            ...o,
                            rawStatus: 'CANCELLED',
                            ...mapOrderStatus('CANCELLED'),
                        }
                        : o,
                ),
            );
            setActionMessage(`Đã hủy đơn #${orders.find((o) => o.id === orderId)?.code || orderId}.`);
        } catch (err) {
            console.error('StaffOrder: hủy đơn hàng thất bại', err);
            setActionError(err?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại.');
        } finally {
            setProcessingOrderId(null);
            setCancelDialogOrderId(null);
        }
    };

    const handleViewRefundDetail = (orderId) => {
        if (!orderId) return;
        navigate(`/staff/refund-orders/${orderId}`);
    };

    const renderOrdersSection = () => (
        <div className={cx('section')}>
            <h2 className={cx('section-title')}>Danh sách đơn hàng</h2>
            <div className={cx('wrap')}>
                <SearchAndSort
                    searchPlaceholder="Tìm kiếm theo mã đơn, tên khách hàng,...."
                    searchValue={keyword}
                    onSearchChange={(e) => setKeyword(e.target.value)}
                    onSearchClick={() => { }}
                    dateFilter={dateFilter}
                    onDateChange={(value) => setDateFilter(value)}
                    dateLabel="dd/mm/yyyy"
                    sortLabel="Sắp xếp:"
                    sortOptions={[
                        { value: 'all', label: 'Tất cả trạng thái' },
                        { value: 'pending', label: 'Chờ xác nhận' },
                        { value: 'processing', label: 'Đang xử lý' },
                        { value: 'shipping', label: 'Đang giao' },
                        { value: 'completed', label: 'Hoàn thành' },
                        { value: 'cancelled', label: 'Đã hủy' },
                    ]}
                    sortValue={statusFilter}
                    onSortChange={(e) => setStatusFilter(e.target.value)}
                />

                {loading && (
                    <div className={cx('info-row')}>Đang tải danh sách đơn hàng...</div>
                )}
                {error && !loading && (
                    <div className={cx('info-row', 'error')}>{error}</div>
                )}
                {actionMessage && (
                    <div className={cx('info-row', 'success')}>{actionMessage}</div>
                )}
                {actionError && (
                    <div className={cx('info-row', 'error')}>{actionError}</div>
                )}

                <div className={cx('card')}>
                    <div className={cx('card-header')}>Danh sách đơn hàng</div>
                    <table className={cx('table')}>
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Username</th>
                                <th>Ngày</th>
                                <th>Tổng</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedOrders.map((order) => {
                                const { label, css } = mapOrderStatus(
                                    order.rawStatus || order.status,
                                );
                                const isPending = css === 'pending';

                                return (
                                    <tr key={order.id}>
                                        <td className={cx('code-cell')}>#{order.code}</td>
                                        <td className={cx('user-cell')}>
                                            <div className={cx('username')}>{order.username}</div>
                                            {order.email && (
                                                <div className={cx('email')}>{order.email}</div>
                                            )}
                                            {order.phoneDisplay && (
                                                <div className={cx('email')}>{order.phoneDisplay}</div>
                                            )}
                                        </td>
                                        <td>
                                            {formatOrderDateTime(order.orderDate)}
                                        </td>
                                        <td>
                                            {new Intl.NumberFormat('vi-VN', {
                                                style: 'currency',
                                                currency: 'VND',
                                            }).format(order.totalAmount || 0)}
                                        </td>
                                        <td className={cx('status-cell')}>
                                            <span className={cx('status-pill', css)}>{label}</span>
                                        </td>
                                        <td className={cx('actions-cell')}>
                                            <button
                                                className={cx('btn', 'view')}
                                                onClick={() => handleViewDetail(order.id)}
                                            >
                                                Xem chi tiết
                                            </button>
                                            <div
                                                className={cx('action-buttons')}
                                                style={{
                                                    visibility: isPending ? 'visible' : 'hidden',
                                                }}
                                            >
                                                <button
                                                    className={cx('btn', 'confirm')}
                                                    onClick={() => handleConfirmOrder(order.id)}
                                                    disabled={processingOrderId === order.id}
                                                >
                                                    Xác nhận
                                                </button>
                                                <button
                                                    className={cx('btn', 'cancel')}
                                                    onClick={() => handleCancelOrder(order.id)}
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedOrders.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className={cx('empty')}>
                                        Không có đơn hàng nào phù hợp.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {renderPaginationControls(
                    currentPage,
                    totalPages,
                    () => setCurrentPage((prev) => Math.max(1, prev - 1)),
                    () => setCurrentPage((prev) => Math.min(totalPages, prev + 1)),
                )}
            </div>
            <CancelOrderDialog
                open={Boolean(cancelDialogOrderId)}
                loading={Boolean(processingOrderId && processingOrderId === cancelDialogOrderId)}
                title="Hủy đơn hàng của khách"
                message="Bạn có chắc chắn muốn hủy đơn hàng này? Vui lòng nhập lý do để lưu lại lịch sử."
                confirmText="Hủy đơn"
                cancelText="Đóng"
                onConfirm={handleConfirmCancelOrder}
                onCancel={() => !processingOrderId && setCancelDialogOrderId(null)}
            />
        </div>
    );

    const renderRefundSection = () => (
        <div className={cx('section', 'refund-section')}>
            <h2 className={cx('section-title')}>Quản lý đơn hoàn về</h2>
            <div className={cx('wrap')}>
                <SearchAndSort
                    searchPlaceholder="Tìm kiếm theo mã đơn, tên khách hàng,...."
                    searchValue={refundKeyword}
                    onSearchChange={(e) => setRefundKeyword(e.target.value)}
                    onSearchClick={() => { }}
                    dateFilter={refundDateFilter}
                    onDateChange={(value) => setRefundDateFilter(value)}
                    dateLabel="dd/mm/yyyy"
                    sortLabel="Sắp xếp:"
                    sortOptions={[
                        { value: 'all', label: 'Tất cả trạng thái' },
                        { value: 'return-cs', label: 'Chờ nhân viên xác nhận hàng' },
                        { value: 'return-staff', label: 'Chờ Admin' },
                        { value: 'return-rejected', label: 'Từ chối' },
                    ]}
                    sortValue={refundStatusFilter}
                    onSortChange={(e) => setRefundStatusFilter(e.target.value)}
                />

                {loading && (
                    <div className={cx('info-row')}>Đang tải danh sách đơn hoàn về...</div>
                )}

                <div className={cx('card', 'refund-card')}>
                    <div className={cx('card-header')}>Danh sách đơn hoàn về</div>
                    <table className={cx('table', 'refund-table')}>
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Tổng tiền</th>
                                <th>Tiền hoàn</th>
                                <th>Ngày nhận hàng</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRefundOrders.map((order) => {
                                const { label, css } = mapOrderStatus(
                                    order.rawStatus || order.status,
                                );

                                return (
                                    <tr key={order.id}>
                                        <td className={cx('code-cell')}>#{order.code}</td>
                                        <td className={cx('user-cell')}>
                                            <div className={cx('username')}>{order.username}</div>
                                            {order.email && (
                                                <div className={cx('email')}>{order.email}</div>
                                            )}
                                        </td>
                                        <td>
                                            {new Intl.NumberFormat('vi-VN', {
                                                style: 'currency',
                                                currency: 'VND',
                                            }).format(order.totalAmount || 0)}
                                        </td>
                                        <td>
                                            {new Intl.NumberFormat('vi-VN', {
                                                style: 'currency',
                                                currency: 'VND',
                                            }).format(order.refundAmount || 0)}
                                        </td>
                                        <td>
                                            {order.receivedDate
                                                ? formatOrderDateTime(order.receivedDate).split(' ')[1] || formatOrderDateTime(order.receivedDate)
                                                : '--'}
                                        </td>
                                        <td className={cx('status-cell')}>
                                            <span className={cx('status-pill', css)}>{label}</span>
                                        </td>
                                        <td className={cx('actions-cell')}>
                                            <button
                                                className={cx('btn', 'view')}
                                                onClick={() => handleViewRefundDetail(order.id)}
                                            >
                                                Xem chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedRefundOrders.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className={cx('empty')}>
                                        Không có đơn hoàn về nào phù hợp.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {renderPaginationControls(
                    refundCurrentPage,
                    refundTotalPages,
                    () => setRefundCurrentPage((prev) => Math.max(1, prev - 1)),
                    () =>
                        setRefundCurrentPage((prev) => Math.min(refundTotalPages, prev + 1)),
                )}
            </div>
        </div>
    );

    return (
        <div className={cx('page')}>
            <div className={cx('header')}>
                <h1 className={cx('title')}>Quản lý đơn hàng</h1>
                <button className={cx('dashboard-btn')} onClick={() => navigate('/staff')}>
                    <span className={cx('icon-left')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M15 18L9 12L15 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </span>
                    Dashboard
                </button>
            </div>

            <div className={cx('tabs-container')}>
                <button
                    className={cx('tab', { active: activeTab === 'orders' })}
                    onClick={() => setActiveTab('orders')}
                >
                    Quản lý đơn hàng
                </button>
                <button
                    className={cx('tab', { active: activeTab === 'refunds' })}
                    onClick={() => setActiveTab('refunds')}
                >
                    Quản lý đơn hoàn về
                </button>
            </div>

            {activeTab === 'orders' ? renderOrdersSection() : renderRefundSection()}

            {isDetailOpen && (
                <div className={cx('detailOverlay')} onClick={handleCloseDetail}>
                    <div className={cx('detailModal')} onClick={(e) => e.stopPropagation()}>
                        <div className={cx('detailHeader')}>
                            <h3>Chi tiết đơn hàng</h3>
                            <button
                                type="button"
                                className={cx('detailClose')}
                                onClick={handleCloseDetail}
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>
                        <div className={cx('detailBody')}>
                            {detailLoading ? (
                                <p className={cx('empty')}>Đang tải chi tiết...</p>
                            ) : orderDetails[selectedOrderId] ? (
                                <div className={cx('detailGrid')}>
                                    <div>
                                        <p className={cx('detailLabel')}>Mã đơn</p>
                                        <p className={cx('detailValue')}>
                                            #{orderDetails[selectedOrderId]?.code ||
                                                orderDetails[selectedOrderId]?.id ||
                                                '--'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className={cx('detailLabel')}>Khách hàng</p>
                                        <p className={cx('detailValue')}>
                                            {orderDetails[selectedOrderId]?.customerName ||
                                                orderDetails[selectedOrderId]?.receiverName ||
                                                '--'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className={cx('detailLabel')}>Email</p>
                                        <p className={cx('detailValue')}>
                                            {orderDetails[selectedOrderId]?.customerEmail || '--'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className={cx('detailLabel')}>Số điện thoại</p>
                                        <p className={cx('detailValue')}>
                                            {orderDetails[selectedOrderId]?.receiverPhone || '--'}
                                        </p>
                                    </div>
                                    <div className={cx('detailFull')}>
                                        <p className={cx('detailLabel')}>Địa chỉ</p>
                                        <p className={cx('detailValue')}>
                                            {orderDetails[selectedOrderId]?.shippingAddress || '--'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className={cx('detailLabel')}>Phương thức thanh toán</p>
                                        <p className={cx('detailValue')}>
                                            {orderDetails[selectedOrderId]?.paymentMethod === 'COD'
                                                ? 'Thanh toán khi nhận hàng (COD)'
                                                : orderDetails[selectedOrderId]?.paymentMethod === 'MOMO'
                                                ? 'Thanh toán qua MoMo'
                                                : orderDetails[selectedOrderId]?.paymentMethod || '--'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className={cx('detailLabel')}>Tổng tiền</p>
                                        <p className={cx('detailValue', 'detailTotal')}>
                                            {new Intl.NumberFormat('vi-VN', {
                                                style: 'currency',
                                                currency: 'VND',
                                            }).format(orderDetails[selectedOrderId]?.totalAmount || 0)}
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
                                            {(orderDetails[selectedOrderId]?.items || []).map(
                                                (item, idx) => (
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
                                                                {item.name ||
                                                                    item.product?.name ||
                                                                    'Sản phẩm'}
                                                            </p>
                                                            <p className={cx('detailItemMeta')}>
                                                                SL: {item.quantity || 0} • Giá:{' '}
                                                                {item.unitPrice != null
                                                                    ? new Intl.NumberFormat('vi-VN', {
                                                                          style: 'currency',
                                                                          currency: 'VND',
                                                                      }).format(item.unitPrice)
                                                                    : '--'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className={cx('empty')}>Không tải được chi tiết đơn hàng.</p>
                            )}
                        </div>
                        <div className={cx('detailFooter')}>
                            <button
                                type="button"
                                className={cx('btn', 'confirm')}
                                onClick={handleCloseDetail}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

