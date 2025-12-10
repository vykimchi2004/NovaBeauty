import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './RefundOrderDetailPage.module.scss';
import { getApiBaseUrl, getStoredToken } from '~/services/utils';
import { normalizeMediaUrl } from '~/services/productUtils';
import ConfirmDialog from '~/components/Common/ConfirmDialog/DeleteAccountDialog';
import notifier from '~/utils/notification';

const cx = classNames.bind(styles);

const viNumberFormatter = new Intl.NumberFormat('vi-VN');

const formatPlainCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '';
    return viNumberFormatter.format(numeric);
};

const buildConfirmationMessage = () =>
    'Xác nhận chuyển hồ sơ hoàn tiền cho Admin xử lý?';

const parseShippingInfo = (raw) => {
    if (!raw || typeof raw !== 'string') return {};
    try {
        const parsed = JSON.parse(raw);
        return {
            name: parsed.name || parsed.receiverName || parsed.recipientName || '',
            phone: parsed.phone || parsed.receiverPhone || parsed.recipientPhone || '',
            address: parsed.address || parsed.fullAddress || parsed.addressText || '',
        };
    } catch {
        return { address: raw };
    }
};

const parseRefundInfo = (order) => {
    if (!order) {
        return {
            reasonType: '',
            description: '',
            refundAmount: 0,
            selectedProductIds: [],
            mediaUrls: [],
        };
    }

    let mediaUrls = [];
    if (order.refundMediaUrls) {
        try {
            const parsed = JSON.parse(order.refundMediaUrls);
            if (Array.isArray(parsed)) {
                mediaUrls = parsed;
            }
        } catch {
            mediaUrls = [];
        }
    }

    let selectedProductIds = [];
    if (order.refundSelectedProductIds) {
        try {
            const parsed = JSON.parse(order.refundSelectedProductIds);
            if (Array.isArray(parsed)) {
                selectedProductIds = parsed;
            }
        } catch {
            selectedProductIds = [];
        }
    }

    return {
        reasonType: order.refundReasonType || '',
        description: order.refundDescription || '',
        refundAmount: order.refundAmount || 0,
        mediaUrls,
        selectedProductIds,
    };
};

const buildRefundSummary = (order, refundInfo, selectedItems = []) => {
    if (!order) {
        return {
            productValue: 0,
            shippingFee: 0,
            secondShippingFee: 0,
            returnPenalty: 0,
            total: 0,
            totalPaid: 0,
            confirmedTotal: 0,
        };
    }

    const shippingFee = order.shippingFee || 0;
    const totalPaid = order.refundTotalPaid ?? order.totalAmount ?? 0;
    
    // Tính giá trị sản phẩm ban đầu (chưa có voucher)
    const rawProductValue = selectedItems.reduce(
        (sum, item) => sum + Number(item.totalPrice || item.finalPrice || 0),
        0,
    );
    
    // Nếu có voucher (totalPaid khác với rawProductValue + shippingFee), 
    // thì giá trị sản phẩm = totalPaid - shippingFee
    // Nếu không có voucher, giữ nguyên giá trị sản phẩm ban đầu
    const productValue = totalPaid > 0 && rawProductValue > 0 && Math.abs(totalPaid - (rawProductValue + shippingFee)) > 0.01
        ? Math.max(0, totalPaid - shippingFee)
        : (rawProductValue > 0 ? rawProductValue : Math.max(0, totalPaid - shippingFee));

    const secondShippingFee = Math.max(
        0,
        Math.round(
            order.refundSecondShippingFee ??
                order.refundReturnFee ??
                order.estimatedReturnShippingFee ??
                order.shippingFee ??
                0,
        ),
    );

    const returnPenalty =
        order.refundPenaltyAmount ??
        (refundInfo.reasonType === 'customer'
            ? Math.max(0, Math.round(productValue * 0.1))
            : 0);

    const reason = refundInfo.reasonType || order.refundReasonType || 'store';
    const fallbackTotal =
        reason === 'store'
            ? totalPaid + secondShippingFee
            : Math.max(0, totalPaid - secondShippingFee - returnPenalty);

    let total = order.refundAmount;
    if (
        total == null ||
        (reason === 'store' && total < fallbackTotal) ||
        (reason !== 'store' && total > fallbackTotal)
    ) {
        total = fallbackTotal;
    }
    const confirmedTotal = order.refundConfirmedAmount ?? total;

    return {
        productValue,
        shippingFee,
        secondShippingFee,
        returnPenalty,
        total,
        totalPaid,
        confirmedTotal,
    };
};

const formatDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

export default function RefundOrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [inspectionStatus, setInspectionStatus] = useState('valid_customer');
    const [receivedDate, setReceivedDate] = useState(formatDateInput(new Date()));
    const [refundAmount, setRefundAmount] = useState(null);
    const [refundAmountDisplay, setRefundAmountDisplay] = useState('');
    const [amountTouched, setAmountTouched] = useState(false);
    const [inspectionNote, setInspectionNote] = useState('');
    const [processing, setProcessing] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
    });

    const apiBaseUrl = getApiBaseUrl();

    useEffect(() => {
        const fetchOrderDetail = async () => {
            try {
                setLoading(true);
                const token = getStoredToken('token');
                if (!token) {
                    setError('Vui lòng đăng nhập để xem chi tiết đơn hoàn về.');
                    setLoading(false);
                    return;
                }

                const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(id)}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Không thể tải thông tin đơn hàng');
                }

                const data = await response.json();
                const orderData = data?.result || data;

                setOrder(orderData);
                const refundInfo = parseRefundInfo(orderData);
                const initialAmount =
                    orderData.refundConfirmedAmount ??
                    refundInfo.refundAmount ??
                    orderData.selectedItemsTotal ??
                    orderData.totalAmount ??
                    0;
                const normalizedInitial = Number(initialAmount) || 0;
                setRefundAmount(normalizedInitial);
                setRefundAmountDisplay(formatPlainCurrency(normalizedInitial));
                const derivedReceivedDate = orderData.returnCheckedDate
                    ? formatDateInput(orderData.returnCheckedDate)
                    : formatDateInput(new Date());
                setReceivedDate(derivedReceivedDate);
                setAmountTouched(false);
            } catch (err) {
                setError(err.message || 'Đã xảy ra lỗi khi tải thông tin.');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchOrderDetail();
        } else {
            setLoading(false);
            setError('Không tìm thấy ID đơn hàng');
        }
    }, [apiBaseUrl, id]);

    const refundInfo = useMemo(() => parseRefundInfo(order), [order]);
    const shippingInfo = useMemo(() => parseShippingInfo(order?.shippingAddress), [order]);

    const selectedItems =
        order?.items?.filter((item) => {
            if (!refundInfo.selectedProductIds.length) return true;
            return refundInfo.selectedProductIds.includes(item.id);
        }) || [];

    const productSubtotal = useMemo(
        () =>
            selectedItems.reduce(
                (sum, item) => sum + Number(item.totalPrice || item.finalPrice || 0),
                0,
            ),
        [selectedItems],
    );

    const baseRefundAmount = useMemo(() => {
        if (productSubtotal > 0) return productSubtotal;
        if (refundInfo.refundAmount) return Number(refundInfo.refundAmount);
        if (order?.selectedItemsTotal) return Number(order.selectedItemsTotal);
        if (order?.totalAmount) return Number(order.totalAmount);
        return 0;
    }, [productSubtotal, refundInfo.refundAmount, order?.selectedItemsTotal, order?.totalAmount]);

    const shippingCompensation = useMemo(() => {
        if (order?.shippingFee != null && !Number.isNaN(Number(order.shippingFee))) {
            return Number(order.shippingFee);
        }
        if (productSubtotal > 0) {
            const orderTotal = Number(order?.totalAmount) || 0;
            const diff = orderTotal - productSubtotal;
            return diff > 0 ? diff : 0;
        }
        return 0;
    }, [order?.shippingFee, order?.totalAmount, productSubtotal]);

    const summary = useMemo(
        () => buildRefundSummary(order, refundInfo, selectedItems),
        [order, refundInfo, selectedItems],
    );

    const staffSummary = useMemo(() => {
        if (!summary) return null;
        const isStoreReason = inspectionStatus === 'valid_store';
        const penalty = isStoreReason ? 0 : Math.max(0, Math.round(summary.productValue * 0.1));
        const total = isStoreReason
            ? summary.totalPaid + summary.secondShippingFee
            : Math.max(0, summary.totalPaid - summary.secondShippingFee - penalty);
        return {
            totalPaid: summary.totalPaid,
            productValue: summary.productValue,
            shippingFee: summary.shippingFee,
            secondShippingFee: summary.secondShippingFee,
            returnPenalty: penalty,
            total,
        };
    }, [summary, inspectionStatus]);

    useEffect(() => {
        if (!staffSummary) {
            return;
        }
        const autoAmount = Number.isFinite(staffSummary.total) ? staffSummary.total : 0;
        setRefundAmount(autoAmount);
        setRefundAmountDisplay(formatPlainCurrency(autoAmount));
        setAmountTouched(false);
    }, [staffSummary, inspectionStatus]);

    const requestedRefundAmount = useMemo(() => {
        if (refundInfo.refundAmount) return Number(refundInfo.refundAmount);
        return selectedItems.reduce(
            (sum, item) => sum + Number(item.totalPrice || item.finalPrice || 0),
            0,
        );
    }, [refundInfo.refundAmount, selectedItems]);

    const normalizedMediaUrls = useMemo(() => {
        if (!refundInfo.mediaUrls || !refundInfo.mediaUrls.length) return [];
        const baseUrlForStatic = apiBaseUrl.replace('/api', '');
        return refundInfo.mediaUrls.map((url) => normalizeMediaUrl(url, baseUrlForStatic));
    }, [apiBaseUrl, refundInfo.mediaUrls]);

    const handleBack = () => {
        // Nếu có state từ location, quay về với tab tương ứng
        const fromTab = location.state?.fromTab;
        if (fromTab) {
            navigate('/staff/orders', { state: { activeTab: fromTab } });
        } else {
            navigate(-1);
        }
    };

    const handleReject = async () => {
        if (!order) return;
        const normalizedStatus = (order?.status || '').toUpperCase();
        const canProcessNow = normalizedStatus === 'RETURN_CS_CONFIRMED';
        if (!canProcessNow) {
            notifier.warning('Đơn này chưa được CSKH chuyển hoặc đã được xử lý.');
            return;
        }
        if (!inspectionNote.trim()) {
            notifier.warning('Vui lòng nhập ghi chú/ lý do từ chối.');
            return;
        }

        try {
            setProcessing(true);
            const token = getStoredToken('token');
            const response = await fetch(
                `${apiBaseUrl}/orders/${encodeURIComponent(id)}/reject-refund`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ reason: inspectionNote, source: 'STAFF' }),
                },
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể từ chối đơn này');
            }

            notifier.success('Đã từ chối đơn hoàn về.');
            navigate('/staff/orders');
        } catch (err) {
            notifier.error(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setProcessing(false);
        }
    };

    const inspectionStatusLabel = (status) => {
        switch (status) {
            case 'valid_store':
                return 'Hợp lệ - lỗi cửa hàng';
            case 'valid_customer':
                return 'Hợp lệ - lỗi khách hàng';
            default:
                return 'Chưa xác định';
        }
    };

    const handleConfirmRefund = async () => {
        const normalizedAmount = Number(refundAmount);
        if (refundAmount === null || !Number.isFinite(normalizedAmount)) {
            notifier.warning('Vui lòng nhập số tiền hoàn hợp lệ.');
            return;
        }
        try {
            setProcessing(true);
            const token = getStoredToken('token');
            const response = await fetch(
                `${apiBaseUrl}/orders/${encodeURIComponent(id)}/staff-confirm-refund`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        note: [
                            inspectionStatusLabel(inspectionStatus),
                            inspectionNote ? `Ghi chú: ${inspectionNote}` : null,
                        ]
                            .filter(Boolean)
                            .join('\n'),
                        refundAmount: normalizedAmount,
                        returnCheckedDate: receivedDate || null,
                    }),
                },
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể xác nhận đơn này');
            }

            notifier.success('Đã xác nhận và chuyển hồ sơ cho Admin xử lý hoàn tiền.');
            navigate('/staff/orders');
        } catch (err) {
            notifier.error(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirm = () => {
        const normalizedAmount = Number(refundAmount);
        if (refundAmount === null || !Number.isFinite(normalizedAmount)) {
            notifier.warning('Vui lòng nhập số tiền hoàn hợp lệ.');
            return;
        }

        setConfirmDialog({
            open: true,
            title: 'Xác nhận hoàn tiền',
            message: buildConfirmationMessage(),
            onConfirm: async () => {
                setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
                await handleConfirmRefund();
            },
        });
    };

    if (loading) {
        return (
            <div className={cx('page')}>
                <div className={cx('loading')}>Đang tải thông tin...</div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className={cx('page')}>
                <div className={cx('error')}>
                    <p>{error || 'Không tìm thấy thông tin đơn hàng'}</p>
                    <button onClick={handleBack}>Quay lại</button>
                </div>
            </div>
        );
    }

    const normalizedStatus = (order?.status || '').toUpperCase();
    const canProcess = normalizedStatus === 'RETURN_CS_CONFIRMED';

    return (
        <div className={cx('page')}>
            <div className={cx('header')}>
                <h1 className={cx('title')}>Kiểm tra đơn hàng hoàn về</h1>
                <button className={cx('back-btn')} onClick={handleBack}>
                    ← Quay lại
                </button>
            </div>

            <div className={cx('card')}>
                <div className={cx('order-code')}>Đơn hàng #{order.code || order.id}</div>

                <div className={cx('section')}>
                    <h3 className={cx('section-heading')}>Thông tin khách hàng</h3>
                    <div className={cx('info-grid')}>
                        <div>
                            <div className={cx('labels')}>Họ tên</div>
                            <input
                                className={cx('input')}
                                value={shippingInfo.name || order.receiverName || ''}
                                readOnly
                            />
                        </div>
                        <div>
                            <div className={cx('labels')}>SĐT</div>
                            <input
                                className={cx('input')}
                                value={shippingInfo.phone || order.receiverPhone || ''}
                                readOnly
                            />
                        </div>
                        <div>
                            <div className={cx('labels')}>Địa chỉ</div>
                            <input
                                className={cx('input')}
                                value={shippingInfo.address || order.shippingAddress || ''}
                                readOnly
                            />
                        </div>
                    </div>
                </div>

                <div className={cx('section')}>
                    <h3 className={cx('section-heading')}>Đơn khách hàng gửi</h3>
                    <div className={cx('request-box')}>
                        <div className={cx('request-row')}>
                            <span>Sản phẩm:</span>
                            <span>
                                {selectedItems.length > 0
                                    ? selectedItems.map((item) => item.name).join(', ')
                                    : 'Không xác định'}
                            </span>
                        </div>
                        <div className={cx('request-row')}>
                            <span>Số lượng:</span>
                            <span>
                                {selectedItems.reduce(
                                    (sum, item) => sum + (item.quantity || 0),
                                    0,
                                )}
                            </span>
                        </div>
                        <div className={cx('request-row')}>
                            <span>Lý do:</span>
                            <span>{refundInfo.description || 'Không có mô tả'}</span>
                        </div>
                        <div>
                            <div className={cx('labels')}>Ảnh khách gửi</div>
                            <div className={cx('media-grid')}>
                                {normalizedMediaUrls.length > 0
                                    ? normalizedMediaUrls.map((url, index) => {
                                          const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i.test(
                                              url,
                                          );
                                          return (
                                              <div key={url} className={cx('media-item')}>
                                                  {isVideo ? (
                                                      <video src={url} controls className={cx('media-content')} />
                                                  ) : (
                                                      <img
                                                          src={url}
                                                          alt={`Ảnh ${index + 1}`}
                                                          className={cx('media-content')}
                                                      />
                                                  )}
                                              </div>
                                          );
                                      })
                                    : [1, 2, 3].map((item) => (
                                          <div key={item} className={cx('media-item')}>
                                              <span className={cx('media-placeholder')}>Ảnh {item}</span>
                                          </div>
                                      ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cx('section')}>
                    <h3 className={cx('section-heading')}>Kiểm tra hàng hoàn</h3>
                    {!canProcess && (
                        <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: 10, padding: 12, marginBottom: 16, color: '#856404' }}>
                            Đơn này hiện không ở trạng thái <b>Hoàn tiền/ trả hàng</b>. Vui lòng yêu cầu khách gửi lại trước khi xác nhận.
                        </div>
                    )}
                    <div className={cx('inspection-form')}>
                        <div>
                            <div className={cx('labels')}>Trạng thái hàng nhận về</div>
                            <select
                                className={cx('select')}
                                value={inspectionStatus}
                                onChange={(e) => setInspectionStatus(e.target.value)}
                            >
                                <option value="valid_store">Hợp lệ - lỗi cửa hàng</option>
                                <option value="valid_customer">Hợp lệ - lỗi khách hàng</option>
                            </select>
                        </div>
                        <div>
                            <div className={cx('labels')}>Ngày nhận hàng</div>
                            <input
                                type="date"
                                className={cx('input-inline')}
                                value={receivedDate}
                                onChange={(e) => setReceivedDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <div className={cx('labels')}>Số tiền hoàn (VND)</div>
                            <input
                                type="text"
                                inputMode="numeric"
                                className={cx('input-inline')}
                                value={refundAmountDisplay}
                                onChange={(e) => {
                                    const raw = e.target.value || '';
                                    const digitsOnly = raw.replace(/\D/g, '');
                                    setAmountTouched(true);
                                    if (!digitsOnly) {
                                        setRefundAmount(null);
                                        setRefundAmountDisplay('');
                                        return;
                                    }
                                    const numericValue = Number(digitsOnly);
                                    if (!Number.isFinite(numericValue)) {
                                        return;
                                    }
                                    setRefundAmount(numericValue);
                                    setRefundAmountDisplay(formatPlainCurrency(numericValue));
                                }}
                                placeholder="Nhập số tiền"
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <div className={cx('labels')}>Ghi chú / lý do nếu không hợp lệ</div>
                        <textarea
                            className={cx('textarea')}
                            value={inspectionNote}
                            onChange={(e) => setInspectionNote(e.target.value)}
                            placeholder="Nhập ghi chú hoặc lý do nếu hàng không hợp lệ..."
                        />
                    </div>
                </div>

                <div className={cx('actions')}>
                    <button className={cx('btn', 'btn-cancel')} onClick={handleBack} disabled={processing}>
                        Hủy
                    </button>
                    <button
                        className={cx('btn', 'btn-reject')}
                        onClick={handleReject}
                        disabled={processing || !canProcess}
                    >
                        {processing ? 'Đang xử lý...' : 'Từ chối'}
                    </button>
                    <button
                        className={cx('btn', 'btn-confirm')}
                        onClick={handleConfirm}
                        disabled={processing || !canProcess}
                    >
                        {processing ? 'Đang xử lý...' : 'Xác nhận hợp lệ & gửi Admin'}
                    </button>
                </div>
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
