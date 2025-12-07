import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './OrderDetailPage.module.scss';
import { formatCurrency, formatDateTime, getApiBaseUrl, getStoredToken } from '~/services/utils';
import { useNotification } from '~/components/Common/Notification';
import ConfirmDialog from '~/components/Common/ConfirmDialog/DeleteAccountDialog';

const cx = classNames.bind(styles);

const mapStatus = (statusRaw) => {
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

const mapItems = (apiOrder) => {
    if (!apiOrder || !Array.isArray(apiOrder.items)) return [];
    return apiOrder.items.map((item, index) => {
        const quantity = item.quantity || 1;
        const price = item.unitPrice ?? item.price ?? 0;
        const total = item.totalPrice ?? price * quantity;
        return {
            id: item.id || String(index),
            name: item.name || item.productName || 'Sản phẩm',
            quantity,
            price,
            total,
        };
    });
};

const mapOrderDetail = (apiOrder) => {
    if (!apiOrder) return null;
    const shippingInfo = parseShippingInfo(apiOrder.shippingAddress);
    const { label, css } = mapStatus(apiOrder.status);
    const items = mapItems(apiOrder);

    return {
        id: apiOrder.id || '',
        code: apiOrder.code || apiOrder.orderCode || apiOrder.id || '',
        customerName:
            apiOrder.receiverName ||
            shippingInfo?.name ||
            apiOrder.customerName ||
            apiOrder.userFullName ||
            'Khách hàng',
        email: apiOrder.customerEmail || apiOrder.userEmail || '',
        phone: apiOrder.receiverPhone || shippingInfo?.phone || apiOrder.customerPhone || '',
        address: shippingInfo?.address || apiOrder.shippingAddress || '',
        paymentMethod:
            apiOrder.paymentMethodLabel ||
            apiOrder.paymentMethod ||
            (apiOrder.paymentType === 'COD' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản'),
        orderDate: apiOrder.orderDateTime || apiOrder.orderDate || apiOrder.createdAt || null,
        totalAmount:
            typeof apiOrder.totalAmount === 'number'
                ? apiOrder.totalAmount
                : Number(apiOrder.totalAmount) || 0,
        statusLabel: label,
        statusClass: css,
        rawStatus: apiOrder.status || '',
        items,
    };
};

const RETURN_FLOW_STATUSES = [
    'RETURN_REQUESTED',
    'RETURN_CS_CONFIRMED',
    'RETURN_STAFF_CONFIRMED',
    'REFUNDED',
    'RETURN_REJECTED',
];

const RETURN_STATUS_LABELS = {
    RETURN_REQUESTED: 'Khách hàng yêu cầu hoàn tiền/ trả hàng',
    RETURN_CS_CONFIRMED: 'CSKH đã xác nhận',
    RETURN_STAFF_CONFIRMED: 'Nhân viên đã xác nhận hàng',
    REFUNDED: 'Hoàn tiền thành công',
    RETURN_REJECTED: 'Từ chối hoàn tiền',
};

const RETURN_PROGRESS_STEPS = [
    { id: 'requested', label: 'Khách hàng yêu cầu hoàn tiền/ trả hàng' },
    { id: 'cskh', label: 'CSKH xác nhận' },
    { id: 'staff', label: 'Nhân viên xác nhận hàng' },
    { id: 'admin', label: 'Admin hoàn tiền' },
];

const resolveReturnStepIndex = (status) => {
    switch (status) {
        case 'RETURN_REQUESTED':
            return 0;
        case 'RETURN_CS_CONFIRMED':
            return 1;
        case 'RETURN_STAFF_CONFIRMED':
            return 2;
        case 'REFUNDED':
            return 3;
        default:
            return 0;
    }
};

const normalizeDateInput = (value) => {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value).split('T')[0];
        }
        return date.toISOString().split('T')[0];
    } catch {
        return String(value).split('T')[0] || '';
    }
};

const buildRefundSummary = (order) => {
    if (!order) return null;

    const productValue =
        order.items?.reduce(
            (sum, item) => sum + Number(item.total || item.totalPrice || item.finalPrice || 0),
            0,
        ) || 0;

    const shippingFee = Number.isFinite(Number(order.shippingFee))
        ? Number(order.shippingFee)
        : 0;

    const totalPaid =
        Number.isFinite(Number(order.refundTotalPaid))
            ? Number(order.refundTotalPaid)
            : Number.isFinite(Number(order.totalAmount))
                ? Number(order.totalAmount)
                : productValue + shippingFee;

    const secondShippingFee = Math.max(
        0,
        Math.round(
            Number.isFinite(Number(order.refundSecondShippingFee))
                ? Number(order.refundSecondShippingFee)
                : Number.isFinite(Number(order.refundReturnFee))
                    ? Number(order.refundReturnFee)
                    : 0,
        ),
    );

    const basePenalty = Number.isFinite(Number(order.refundPenaltyAmount))
        ? Number(order.refundPenaltyAmount)
        : 0;

    // Tổng hoàn ban đầu theo logic khách nhìn thấy (dựa trên refundReasonType gốc)
    const reason = String(order.refundReasonType || '').toLowerCase();
    const customerTotal =
        reason === 'store'
            ? totalPaid + secondShippingFee
            : Math.max(0, totalPaid - secondShippingFee - basePenalty);

    // Suy ra kết luận của kho: lỗi khách hay lỗi cửa hàng từ staffInspectionResult/note
    const inspectionText = String(order.staffInspectionResult || order.note || '').toLowerCase();
    let staffReason = null;
    if (inspectionText.includes('lỗi khách hàng')) {
        staffReason = 'customer';
    } else if (inspectionText.includes('lỗi cửa hàng')) {
        staffReason = 'store';
    }

    // Penalty & tổng hoàn theo trạng thái hàng nhận về (ưu tiên dữ liệu kho, nếu không có thì tự tính lại)
    const staffPenalty =
        staffReason === 'customer'
            ? (basePenalty > 0 ? basePenalty : Math.max(0, Math.round(productValue * 0.1)))
            : 0;

    const staffFormulaTotal =
        staffReason === 'store'
            ? totalPaid + secondShippingFee
            : Math.max(0, totalPaid - secondShippingFee - staffPenalty);

    // Nếu STAFF đã có kết luận (staffReason != null) thì luôn dùng công thức theo kết luận đó,
    // không dùng lại số tiền cũ của khách.
    // Chỉ khi chưa suy ra được staffReason mới fallback sang số đã lưu trong DB (refundConfirmedAmount/refundAmount).
    let staffTotal;
    if (staffReason) {
        staffTotal = staffFormulaTotal;
    } else {
        const staffRawTotal =
            Number.isFinite(Number(order.refundConfirmedAmount))
                ? Number(order.refundConfirmedAmount)
                : Number.isFinite(Number(order.refundAmount))
                    ? Number(order.refundAmount)
                    : NaN;
        staffTotal = Number.isFinite(staffRawTotal) ? staffRawTotal : customerTotal;
    }

    return {
        totalPaid,
        productValue,
        shippingFee,
        secondShippingFee,
        returnPenalty: staffReason === 'customer' ? staffPenalty : basePenalty,
        // Field cũ, dùng cho chỗ khác nếu có
        total: staffTotal,
        // Dùng cho 2 block tóm tắt
        customerTotal,
        staffTotal,
    };
};

const buildAdminConfirmMessage = () =>
    'Bạn có chắc chắn muốn xác nhận hoàn tiền cho đơn hàng này?';

export default function OrderDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

    const [order, setOrder] = useState(null);
    const [rawOrder, setRawOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        returnStatus: '',
        returnDate: '',
        verificationResult: '',
        refundAmount: '',
        bankAccount: '',
        bankName: '',
        accountHolder: '',
        processingNote: '',
    });
    const [staffNote, setStaffNote] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
    });
    const { error: notifyError, success: notifySuccess } = useNotification();
    const refundSummary = useMemo(() => buildRefundSummary(rawOrder), [rawOrder]);

    const fetchDetail = async () => {
        if (!id) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        try {
            setLoading(true);
            setError('');

            const token = getStoredToken('token');
            const resp = await fetch(`${apiBaseUrl}/orders/${id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!resp.ok) {
                throw new Error(`API error ${resp.status}`);
            }

            const data = await resp.json().catch(() => ({}));
            const raw = data?.result || data || null;
            const mapped = mapOrderDetail(raw);
            if (isMounted) {
                setOrder(mapped);
                setRawOrder(raw);
                const normalizedStatus = String(raw?.status || '').toUpperCase();
                const noteText = String(raw?.note || '');
                setStaffNote(noteText);
                const staffReviewed =
                    normalizedStatus === 'RETURN_STAFF_CONFIRMED' || normalizedStatus === 'REFUNDED';
                const inspectionFromNote = (() => {
                    if (!noteText || !staffReviewed) return '';
                    const lines = noteText.split(/\r?\n/);
                    for (let i = lines.length - 1; i >= 0; i -= 1) {
                        const line = lines[i].trim();
                        if (!line) continue;
                        if (!line.toLowerCase().startsWith('ghi chú')) {
                            return line;
                        }
                    }
                    return '';
                })();
                const derivedVerification = staffReviewed
                    ? raw?.staffInspectionResult || inspectionFromNote || ''
                    : '';
                const derivedRefundAmount =
                    staffReviewed && raw?.refundAmount != null ? String(raw.refundAmount) : '';
                setFormData((prev) => ({
                    ...prev,
                    returnStatus: RETURN_STATUS_LABELS[normalizedStatus] || prev.returnStatus,
                    returnDate:
                        normalizeDateInput(raw?.returnCheckedDate) ||
                        normalizeDateInput(raw?.returnDate) ||
                        prev.returnDate,
                    verificationResult: derivedVerification || '',
                    refundAmount: derivedRefundAmount || '',
                    bankAccount: raw?.refundAccountNumber || prev.bankAccount || '',
                    bankName: raw?.refundBank || prev.bankName || '',
                    accountHolder:
                        raw?.refundAccountHolder || mapped?.customerName || prev.accountHolder,
                    processingNote: raw?.adminProcessingNote || '',
                }));
            }
        } catch (err) {
            console.error('Admin order detail: fetch failed', err);
            if (isMounted) {
                setError('Không thể tải chi tiết đơn hàng. Vui lòng thử lại.');
            }
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [apiBaseUrl, id]);

    const handleBack = () => {
        navigate(-1);
    };

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const executeConfirmRefund = async () => {
        try {
            setConfirming(true);
            const token = getStoredToken('token');
            const apiBaseUrl = getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(id)}/confirm-refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    note: formData.processingNote || undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.message || 'Không thể xác nhận hoàn tiền');
            }

            notifySuccess('Đã xác nhận hoàn tiền thành công.');
            // Refresh data để hiển thị trạng thái mới
            await fetchDetail();
        } catch (err) {
            console.error('Error confirming refund:', err);
            notifyError(err.message || 'Có lỗi xảy ra khi xác nhận hoàn tiền.');
        } finally {
            setConfirming(false);
        }
    };

    const handleConfirmRefund = (canConfirm) => {
        if (!canConfirm) {
            notifyError('Không thể xác nhận hoàn tiền khi nhân viên chưa xác nhận đơn hàng.');
            return;
        }

        setConfirmDialog({
            open: true,
            title: 'Xác nhận hoàn tiền',
            message: buildAdminConfirmMessage(refundSummary),
            onConfirm: async () => {
                setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
                await executeConfirmRefund();
            },
        });
    };

    const renderLoadingState = (title) => (
        <div className={cx('page')}>
            <div className={cx('pageHeader')}>
                <button type="button" className={cx('backBtn')} onClick={handleBack}>
                    ←
                </button>
                <div>
                    <p className={cx('eyebrow')}>Đơn hàng</p>
                    <h1>{title}</h1>
                </div>
            </div>
            <div className={cx('stateCard')}>Đang tải dữ liệu...</div>
        </div>
    );

    const renderErrorState = (title) => (
        <div className={cx('page')}>
            <div className={cx('pageHeader')}>
                <button type="button" className={cx('backBtn')} onClick={handleBack}>
                    ←
                </button>
                <div>
                    <p className={cx('eyebrow')}>Đơn hàng</p>
                    <h1>{title}</h1>
                </div>
            </div>
            <div className={cx('stateCard', 'error')}>
                <p>{error || 'Không tìm thấy đơn hàng.'}</p>
                <button type="button" onClick={handleBack}>
                    Quay lại
                </button>
            </div>
        </div>
    );

    if (loading) {
        return renderLoadingState('Chi tiết đơn hàng');
    }

    if (error || !order) {
        return renderErrorState('Chi tiết đơn hàng');
    }

    const normalizedReturnStatus = String(order.rawStatus || order.status || '')
        .trim()
        .toUpperCase();
    const isReturnFlow = RETURN_FLOW_STATUSES.includes(normalizedReturnStatus);
    const canAdminConfirm = normalizedReturnStatus === 'RETURN_STAFF_CONFIRMED';
    const pageTitle = isReturnFlow ? 'Xử lý hoàn tiền/ trả hàng' : 'Chi tiết đơn hàng';
    const isReturnRejected = normalizedReturnStatus === 'RETURN_REJECTED';
    const isRefunded = normalizedReturnStatus === 'REFUNDED';
    const currentReturnStep = resolveReturnStepIndex(normalizedReturnStatus);
    const progressSteps = RETURN_PROGRESS_STEPS.map((step, index) => ({
        ...step,
        completed: !isReturnRejected && index <= currentReturnStep,
        active: !isReturnRejected && index === currentReturnStep,
    }));

    const primaryItem = order.items[0] || null;

    if (!isReturnFlow) {
        return (
            <div className={cx('page')}>
                <div className={cx('pageHeader')}>
                    <button type="button" className={cx('backBtn')} onClick={handleBack}>
                        ←
                    </button>
                    <div className={cx('titleGroup')}>
                        <p className={cx('eyebrow')}>Đơn hàng #{order.code}</p>
                        <h1>{pageTitle}</h1>
                    </div>
                </div>

                <section className={cx('standardCard')}>
                    <div className={cx('detailHeader')}>
                        <div>
                            <p className={cx('summaryEyebrow')}>Chi tiết đơn hàng</p>
                            <h2>#{order.code}</h2>
                        </div>
                        <span className={cx('statusBadge', order.statusClass)}>{order.statusLabel}</span>
                    </div>

                    <div className={cx('infoGrid')}>
                        <div>
                            <p className={cx('infoLabel')}>Họ và tên</p>
                            <p className={cx('infoValue')}>{order.customerName}</p>
                            <p className={cx('infoLabel')}>SĐT</p>
                            <p className={cx('infoValue')}>{order.phone || '---'}</p>
                            <p className={cx('infoLabel')}>Ngày đặt</p>
                            <p className={cx('infoValue')}>
                                {order.orderDate ? formatDateTime(order.orderDate) : '---'}
                            </p>
                            <p className={cx('infoLabel')}>Tổng tiền</p>
                            <p className={cx('infoValue')}>{formatCurrency(order.totalAmount)}</p>
                        </div>
                        <div>
                            <p className={cx('infoLabel')}>Email</p>
                            <p className={cx('infoValue')}>{order.email || '---'}</p>
                            <p className={cx('infoLabel')}>Địa chỉ</p>
                            <p className={cx('infoValue')}>{order.address || '---'}</p>
                            <p className={cx('infoLabel')}>Phương thức thanh toán</p>
                            <p className={cx('infoValue')}>{order.paymentMethod || '---'}</p>
                        </div>
                    </div>
                </section>

                <section className={cx('itemsCard')}>
                    <h3>Sản phẩm</h3>
                    <div className={cx('tableWrapper')}>
                        <table className={cx('itemsTable')}>
                            <thead>
                                <tr>
                                    <th>Tên sản phẩm</th>
                                    <th>Số lượng</th>
                                    <th>Giá</th>
                                    <th>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>{formatCurrency(item.price)}</td>
                                        <td>{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className={cx('page')}>
            <div className={cx('pageHeader')}>
                <button type="button" className={cx('backBtn')} onClick={handleBack}>
                    ←
                </button>
                <div className={cx('titleGroup')}>
                    <p className={cx('eyebrow')}>Đơn hàng #{order.code}</p>
                    <h1>{pageTitle}</h1>
                </div>
                <span className={cx('statusBadge', order.statusClass)}>{order.statusLabel}</span>
            </div>

            <div className={cx('layout')}>
                {isReturnFlow && (
                    <div className={cx('returnProgressWrapper', { rejected: isReturnRejected })}>
                        {progressSteps.map((step, idx) => (
                            <div
                                key={step.id}
                                className={cx('returnStep', {
                                    completed: step.completed,
                                    active: step.active,
                                })}
                            >
                                <div className={cx('returnStepCircle')}>
                                    {step.completed ? '✓' : idx + 1}
                                </div>
                                {idx < progressSteps.length - 1 && (
                                    <div
                                        className={cx('returnStepConnector', {
                                            completed: step.completed,
                                        })}
                                    />
                                )}
                                <p className={cx('returnStepLabel')}>{step.label}</p>
                            </div>
                        ))}
                        {isReturnRejected && (
                            <div className={cx('returnStepRejected')}>
                                Yêu cầu đã bị từ chối. {staffNote ? `Ghi chú: ${staffNote}` : ''}
                            </div>
                        )}
                    </div>
                )}
                <section className={cx('summaryCard')}>
                    <div className={cx('summaryHeader')}>
                        <div>
                            <p className={cx('summaryEyebrow')}>Đối chiếu với đơn khách hàng</p>
                            <h2>Thông tin</h2>
                        </div>
                        <div className={cx('summaryMeta')}>
                            <span>Nhân viên xử lý</span>
                            <p>ADMIN</p>
                        </div>
                    </div>

                    <div className={cx('comparisonGrid')}>
                        <div>
                            <p className={cx('metaLabel')}>Sản phẩm</p>
                            <p className={cx('metaValue')}>
                                {primaryItem?.name || primaryItem?.productName || '---'}
                            </p>
                            <p className={cx('metaLabel')}>Số lượng</p>
                            <p className={cx('metaValue')}>{primaryItem?.quantity || 1}</p>
                            <p className={cx('metaLabel')}>Thành tiền</p>
                            <p className={cx('metaValue')}>{formatCurrency(order.totalAmount)}</p>
                            <p className={cx('metaLabel')}>Địa chỉ</p>
                            <p className={cx('metaValue')}>{order.address || '---'}</p>
                        </div>
                        <div>
                            <p className={cx('metaLabel')}>Khách hàng</p>
                            <p className={cx('metaValue')}>{order.customerName}</p>
                            <p className={cx('metaLabel')}>SĐT</p>
                            <p className={cx('metaValue')}>{order.phone || '---'}</p>
                            <p className={cx('metaLabel')}>Ngày đặt</p>
                            <p className={cx('metaValue')}>
                                {order.orderDate ? formatDateTime(order.orderDate) : '---'}
                            </p>
                            <p className={cx('metaLabel')}>Phương thức thanh toán</p>
                            <p className={cx('metaValue')}>{order.paymentMethod || '---'}</p>
                        </div>
                    </div>
                </section>

                <section className={cx('sectionCard')}>
                    <div className={cx('sectionHeader')}>
                        <h3>Xử lý trả hàng</h3>
                        <span className={cx('pill')}>{formData.returnStatus}</span>
                    </div>
                    <div className={cx('formGrid')}>
                        <label className={cx('formField')}>
                            <span>Trạng thái hàng hóa</span>
                            <input type="text" value={formData.returnStatus} readOnly className={cx('readonlyInput')} />
                        </label>
                        <label className={cx('formField')}>
                            <span>Ngày nhận hàng hoàn</span>
                            <input type="date" value={formData.returnDate} readOnly />
                        </label>
                    </div>
                </section>

                {refundSummary && (
                    <section className={cx('sectionCard')}>
                        <div className={cx('sectionHeader')}>
                            <h3>Tóm tắt hoàn tiền</h3>
                        </div>
                        <div className={cx('refundSummaryGrid')}>
                            <div className={cx('refundSummaryBlock')}>
                                <p className={cx('refundSummaryHeading')}>Khách đề xuất</p>
                                <div className={cx('refundSummaryRow')}>
                                    <span>Tổng đơn (đã thanh toán)</span>
                                    <span>{formatCurrency(refundSummary.totalPaid)}</span>
                                </div>
                                <div className={cx('refundSummaryRow')}>
                                    <span>Giá trị sản phẩm</span>
                                    <span>{formatCurrency(refundSummary.productValue)}</span>
                                </div>
                                <div className={cx('refundSummaryRow')}>
                                    <span>Phí vận chuyển (lần đầu)</span>
                                    <span>{formatCurrency(refundSummary.shippingFee)}</span>
                                </div>
                                <div className={cx('refundSummaryRow')}>
                                    <span>Phí ship (lần 2 - khách tạm ứng)</span>
                                    <span>{formatCurrency(refundSummary.secondShippingFee)}</span>
                                </div>
                                <div className={cx('refundSummaryRow')}>
                                    <span>Phí hoàn trả (10% khi lỗi khách hàng)</span>
                                    <span>{formatCurrency(refundSummary.returnPenalty)}</span>
                                </div>
                                <div className={cx('refundSummaryRow', 'total')}>
                                    <span>Tổng hoàn (theo khách đề xuất)</span>
                                    <span>{formatCurrency(refundSummary.customerTotal)}</span>
                                </div>
                            </div>

                            <div className={cx('refundSummaryBlock')}>
                                <p className={cx('refundSummaryHeading')}>Theo trạng thái hàng nhận về</p>
                                <div className={cx('refundSummaryRow')}>
                                    <span>Tổng đơn (đã thanh toán)</span>
                                    <span>{formatCurrency(refundSummary.totalPaid)}</span>
                                </div>
                                <div className={cx('refundSummaryRow')}>
                                    <span>Giá trị sản phẩm</span>
                                    <span>{formatCurrency(refundSummary.productValue)}</span>
                                </div>
                                <div className={cx('refundSummaryRow')}>
                                    <span>Phí vận chuyển (lần đầu)</span>
                                    <span>{formatCurrency(refundSummary.shippingFee)}</span>
                                </div>
                                <div className={cx('refundSummaryRow')}>
                                    <span>Phí ship (lần 2 - khách tạm ứng)</span>
                                    <span>{formatCurrency(refundSummary.secondShippingFee)}</span>
                                </div>
                                <div className={cx('refundSummaryRow')}>
                                    <span>Phí hoàn trả (10% khi lỗi khách hàng)</span>
                                    <span>{formatCurrency(refundSummary.returnPenalty)}</span>
                                </div>
                                <div className={cx('refundSummaryRow', 'total')}>
                                    <span>Tổng hoàn (nhân viên xác nhận)</span>
                                    <span>{formatCurrency(refundSummary.staffTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <section className={cx('sectionCard')}>
                    <div className={cx('sectionHeader')}>
                        <h3>Xử lý hoàn tiền</h3>
                        <p>Kết quả xác minh & thông tin thanh toán</p>
                    </div>
                    <div className={cx('formGrid')}>
                        <label className={cx('formField')}>
                            <span>Kết quả xác minh</span>
                            <input type="text" value={formData.verificationResult} readOnly className={cx('readonlyInput')} />
                        </label>
                        <label className={cx('formField')}>
                            <span>Số tiền hoàn (VNĐ)</span>
                            <input type="number" value={formData.refundAmount} readOnly />
                        </label>
                        <label className={cx('formField')}>
                            <span>Số tài khoản</span>
                            <input type="text" value={formData.bankAccount} readOnly />
                        </label>
                        <label className={cx('formField')}>
                            <span>Ngân hàng</span>
                            <input type="text" value={formData.bankName} readOnly />
                        </label>
                        <label className={cx('formField')}>
                            <span>Chủ tài khoản</span>
                            <input type="text" value={formData.accountHolder} readOnly />
                        </label>
                    </div>
                    <label className={cx('formField', 'full')}>
                        <span>Ghi chú xử lý</span>
                        <textarea rows={4} value={formData.processingNote} readOnly />
                    </label>
                </section>
            </div>

            <div className={cx('actions')}>
                {isRefunded ? (
                    <div className={cx('refund-completed-message')}>
                        <p>✓ Đơn hàng đã được hoàn tiền thành công</p>
                    </div>
                ) : (
                    <>
                        <button 
                            type="button" 
                            className={cx('btn', 'ghost')} 
                            onClick={handleBack}
                            disabled={isRefunded || confirming}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            className={cx('btn', 'primary')}
                            onClick={() => handleConfirmRefund(canAdminConfirm)}
                            disabled={!canAdminConfirm || isRefunded || confirming}
                        >
                            {confirming ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
                        </button>
                    </>
                )}
            </div>
            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() =>
                    setConfirmDialog({ open: false, title: '', message: '', onConfirm: null })
                }
                confirmText="Xác nhận"
                cancelText="Hủy"
            />
        </div>
    );
}

