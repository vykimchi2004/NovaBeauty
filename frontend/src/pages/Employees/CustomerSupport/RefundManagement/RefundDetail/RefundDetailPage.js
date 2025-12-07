import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './RefundDetailPage.module.scss';
import { getApiBaseUrl, getStoredToken, formatCurrency } from '~/services/utils';
import { normalizeMediaUrl } from '~/services/productUtils';
import { useNotification } from '~/components/Common/Notification';
import ConfirmDialog from '~/components/Common/ConfirmDialog/DeleteAccountDialog';
import RejectOrderRefundDialog from '~/components/Common/ConfirmDialog/RejectOrderRefundDialog';

const cx = classNames.bind(styles);

// Parse refund information from order (prefer dedicated fields, fallback to note)
const parseRefundInfo = (order) => {
    // Debug log
    console.log('🔍 parseRefundInfo - Order data:', {
        refundReasonType: order.refundReasonType,
        refundDescription: order.refundDescription,
        refundReturnAddress: order.refundReturnAddress,
        refundMediaUrls: order.refundMediaUrls,
        refundBank: order.refundBank,
        refundAccountNumber: order.refundAccountNumber,
        refundAccountHolder: order.refundAccountHolder,
    });

    // First, try to get from dedicated refund fields (new way)
    if (order.refundReasonType || order.refundDescription || order.refundReturnAddress) {
        let selectedProducts = [];
        if (order.refundSelectedProductIds) {
            try {
                selectedProducts = JSON.parse(order.refundSelectedProductIds);
            } catch (e) {
                console.warn('Failed to parse refundSelectedProductIds', e);
                // If parsing fails, default to all products
                selectedProducts = order.items?.map(item => item.id) || [];
            }
        } else {
            // Default to all products if not specified
            selectedProducts = order.items?.map(item => item.id) || [];
        }

        let mediaUrls = [];
        if (order.refundMediaUrls) {
            try {
                // Handle both string and already parsed array
                let parsed = order.refundMediaUrls;
                if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed);
                }
                if (Array.isArray(parsed)) {
                    mediaUrls = parsed;
                } else if (typeof parsed === 'string' && parsed.trim().startsWith('[')) {
                    // Try parsing again if it's still a string
                    parsed = JSON.parse(parsed);
                    if (Array.isArray(parsed)) {
                        mediaUrls = parsed;
                    }
                }
                console.log('🔍 Parsed mediaUrls:', mediaUrls);
            } catch (e) {
                console.error('Failed to parse refund media URLs', e, 'Raw value:', order.refundMediaUrls);
            }
        }

        const refundInfo = {
            reason: order.refundReasonType === 'store'
                ? 'Sản phẩm gặp sự cố từ cửa hàng'
                : order.refundReasonType === 'customer'
                    ? 'Thay đổi nhu cầu / Mua nhầm'
                    : '',
            reasonType: order.refundReasonType || null,
            description: order.refundDescription || '',
            email: order.refundEmail || order.customerEmail || '',
            returnAddress: order.refundReturnAddress || '',
            refundMethod: order.refundMethod || '',
            bank: order.refundBank || '',
            accountNumber: order.refundAccountNumber || '',
            accountHolder: order.refundAccountHolder || '',
            selectedProducts: selectedProducts,
            refundAmount: order.refundAmount || null,
            mediaUrls: mediaUrls,
        };

        console.log('🔍 Parsed refundInfo:', refundInfo);
        return refundInfo;
    }

    // Fallback: parse from note (old way, for backward compatibility)
    const note = order.note || '';
    if (!note || typeof note !== 'string') {
        return {
            reason: '',
            reasonType: null,
            description: '',
            email: order.customerEmail || '',
            returnAddress: '',
            refundMethod: '',
            bank: '',
            accountNumber: '',
            accountHolder: '',
            selectedProducts: order?.items?.map(item => item.id) || [],
            refundAmount: null,
            mediaUrls: [],
        };
    }

    const info = {
        reason: '',
        reasonType: null,
        description: '',
        email: order.customerEmail || '',
        returnAddress: '',
        refundMethod: '',
        bank: '',
        accountNumber: '',
        accountHolder: '',
        selectedProducts: order?.items?.map(item => item.id) || [],
        refundAmount: null,
        mediaUrls: [],
    };

    // Parse reason
    if (note.includes('Sản phẩm gặp sự cố từ cửa hàng')) {
        info.reason = 'Sản phẩm gặp sự cố từ cửa hàng';
        info.reasonType = 'store';
    } else if (note.includes('Thay đổi nhu cầu / Mua nhầm')) {
        info.reason = 'Thay đổi nhu cầu / Mua nhầm';
        info.reasonType = 'customer';
    }

    // Parse description
    const descMatch = note.match(/Mô tả:\s*(.+?)(?:\n|$)/);
    if (descMatch) {
        info.description = descMatch[1].trim();
    }

    // Parse email
    const emailMatch = note.match(/Email:\s*(.+?)(?:\n|$)/);
    if (emailMatch) {
        info.email = emailMatch[1].trim();
    }

    // Parse return address
    const addressMatch = note.match(/Địa chỉ gửi hàng:\s*(.+?)(?:\n|$)/);
    if (addressMatch) {
        info.returnAddress = addressMatch[1].trim();
    }

    // Parse refund method
    const methodMatch = note.match(/Phương thức hoàn tiền:\s*(.+?)(?:\n|$)/);
    if (methodMatch) {
        info.refundMethod = methodMatch[1].trim();
    }

    // Parse bank info
    const bankMatch = note.match(/Ngân hàng:\s*(.+?)(?:\n|$)/);
    if (bankMatch) {
        info.bank = bankMatch[1].trim();
    }

    const accountMatch = note.match(/Số tài khoản:\s*(.+?)(?:\n|$)/);
    if (accountMatch) {
        info.accountNumber = accountMatch[1].trim();
    }

    const holderMatch = note.match(/Chủ tài khoản:\s*(.+?)(?:\n|$)/);
    if (holderMatch) {
        info.accountHolder = holderMatch[1].trim();
    }

    return info;
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
            confirmedSecondShippingFee: 0,
            confirmedPenalty: 0,
        };
    }

    const productValue = selectedItems.reduce(
        (sum, item) => sum + (item.totalPrice || item.finalPrice || 0),
        0,
    );
    const shippingFee = order.shippingFee || 0;
    const totalPaid = order.refundTotalPaid ?? order.totalAmount ?? productValue + shippingFee;

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

    const customerTotal = order.refundAmount ?? fallbackTotal;
    const confirmedTotal = order.refundConfirmedAmount ?? customerTotal;
    const confirmedSecondShippingFee =
        order.refundConfirmedSecondShippingFee ?? secondShippingFee;
    const confirmedPenalty = order.refundConfirmedPenalty ?? returnPenalty;

    return {
        productValue,
        shippingFee,
        secondShippingFee,
        returnPenalty,
        total: customerTotal,
        totalPaid,
        confirmedTotal,
        confirmedSecondShippingFee,
        confirmedPenalty,
    };
};

export default function RefundDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success: notifySuccess, error: notifyError } = useNotification();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [rejectionNote, setRejectionNote] = useState('');
    const [processing, setProcessing] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
    });
    const [rejectDialog, setRejectDialog] = useState(false);

    useEffect(() => {
        const fetchOrderDetail = async () => {
            try {
                setLoading(true);
                setError('');
                const token = getStoredToken('token');
                if (!token) {
                    setError('Vui lòng đăng nhập để xem chi tiết đơn hàng');
                    setLoading(false);
                    return;
                }

                const apiBaseUrl = getApiBaseUrl();
                console.log('🔍 Fetching order detail for id:', id);

                const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(id)}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log('🔍 Order detail response status:', response.status, response.statusText);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('🔍 Order detail error:', errorData);

                    let errorMessage = 'Không thể tải thông tin đơn hàng';
                    if (response.status === 403 || response.status === 401) {
                        errorMessage = 'Bạn không có quyền truy cập đơn hàng này';
                    } else if (response.status === 404) {
                        errorMessage = 'Không tìm thấy đơn hàng';
                    } else if (errorData?.message) {
                        errorMessage = errorData.message;
                    }

                    throw new Error(errorMessage);
                }

                const data = await response.json();
                console.log('🔍 Order detail data:', data);
                const orderData = data?.result || data;

                if (!orderData || !orderData.id) {
                    throw new Error('Dữ liệu đơn hàng không hợp lệ');
                }

                // Log refund fields để debug
                console.log('🔍 Order refund fields:', {
                    refundReasonType: orderData.refundReasonType,
                    refundDescription: orderData.refundDescription,
                    refundMediaUrls: orderData.refundMediaUrls,
                    refundBank: orderData.refundBank,
                    refundAccountNumber: orderData.refundAccountNumber,
                    refundAccountHolder: orderData.refundAccountHolder,
                    refundEmail: orderData.refundEmail,
                    refundReturnAddress: orderData.refundReturnAddress,
                    refundMethod: orderData.refundMethod,
                    refundSelectedProductIds: orderData.refundSelectedProductIds,
                });

                setOrder(orderData);
            } catch (err) {
                console.error('Error fetching order detail:', err);
                setError(err.message || 'Đã xảy ra lỗi khi tải thông tin đơn hàng');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchOrderDetail();
        } else {
            setError('Không có ID đơn hàng');
            setLoading(false);
        }
    }, [id]);

    const handleCancel = () => {
        navigate(-1);
    };

    const handleImageClick = (index) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const handleCloseLightbox = () => {
        setLightboxOpen(false);
    };

    const handlePrevImage = (e) => {
        e.stopPropagation();
        if (normalizedMediaUrls.length > 0) {
            setLightboxIndex((prev) => (prev - 1 + normalizedMediaUrls.length) % normalizedMediaUrls.length);
        }
    };

    const handleNextImage = (e) => {
        e.stopPropagation();
        if (normalizedMediaUrls.length > 0) {
            setLightboxIndex((prev) => (prev + 1) % normalizedMediaUrls.length);
        }
    };

    const orderStatus = order?.status || '';
    const normalizedStatus = (orderStatus || '').toUpperCase();
    const canProcess = normalizedStatus === 'RETURN_REQUESTED';
    const hasStaffConfirmed =
        (normalizedStatus === 'RETURN_STAFF_CONFIRMED' || normalizedStatus === 'REFUNDED') &&
        typeof order.refundConfirmedAmount === 'number' &&
        order.refundConfirmedAmount > 0;

    const handleReject = () => {
        if (!canProcess) {
            notifyError('Đơn này đã được chuyển sang bộ phận tiếp theo, không thể từ chối.');
            return;
        }
        if (!rejectionNote.trim()) {
            notifyError('Vui lòng nhập lý do từ chối.');
            return;
        }

        setRejectDialog(true);
    };

    const handleConfirmReject = async () => {
        setRejectDialog(false);

        try {
            setProcessing(true);
            const token = getStoredToken('token');
            const apiBaseUrl = getApiBaseUrl();

            const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(id)}/reject-refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    reason: rejectionNote,
                    source: 'CSKH',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.message || 'Không thể từ chối yêu cầu hoàn tiền');
            }

            notifySuccess('Đã từ chối yêu cầu hoàn tiền.');
            navigate('/customer-support/refund-management');
        } catch (err) {
            console.error('Error rejecting refund:', err);
            notifyError(err.message || 'Có lỗi xảy ra khi từ chối yêu cầu. Vui lòng thử lại.');
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmRefund = async () => {
        try {
            setProcessing(true);
            const token = getStoredToken('token');
            const apiBaseUrl = getApiBaseUrl();

            const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(id)}/cs-confirm-refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    note: rejectionNote || undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.message || 'Không thể xác nhận yêu cầu hoàn tiền');
            }

            notifySuccess('Đã xác nhận và chuyển yêu cầu cho nhân viên xử lý.');
            navigate('/customer-support/refund-management');
        } catch (err) {
            console.error('Error confirming refund:', err);
            notifyError(err.message || 'Có lỗi xảy ra khi xác nhận yêu cầu. Vui lòng thử lại.');
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirm = () => {
        if (!canProcess) {
            notifyError('Đơn này đã được chuyển sang cho nhân viên xử lý.');
            return;
        }

        setConfirmDialog({
            open: true,
            title: 'Xác nhận hoàn tiền',
            message: 'Bạn có chắc chắn muốn xác nhận hồ sơ hoàn hàng và chuyển cho nhân viên xử lý không?',
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
                    <button onClick={() => navigate(-1)}>Quay lại</button>
                </div>
            </div>
        );
    }

    const refundInfo = parseRefundInfo(order);
    const shippingInfo = parseShippingInfo(order.shippingAddress);

    // Get selected products for refund
    const selectedItems = order.items?.filter(item => refundInfo.selectedProducts.includes(item.id)) || [];
    const summary = buildRefundSummary(order, refundInfo, selectedItems);

    // Normalize media URLs
    const apiBaseUrl = getApiBaseUrl();
    const baseUrlForStatic = apiBaseUrl.replace('/api', '');
    const normalizedMediaUrls = (refundInfo.mediaUrls || []).map(url =>
        normalizeMediaUrl(url, baseUrlForStatic)
    );

    // Parse rejection reason nếu đơn đã bị từ chối
    const isRejected = orderStatus && (
        orderStatus.toUpperCase() === 'RETURN_REJECTED' ||
        orderStatus === 'RETURN_REJECTED' ||
        orderStatus === 'return_rejected' ||
        orderStatus.includes('REJECTED')
    );
    let rejectionReason = order?.refundRejectionReason || '';
    if (!rejectionReason && order?.note) {
        const noteText = order.note;
        const rejectionMatch = noteText.match(/Lý do:\s*(.+?)(?:\n|$)/i);
        if (rejectionMatch && rejectionMatch[1]) {
            rejectionReason = rejectionMatch[1].trim();
        } else if (noteText.includes('Yêu cầu hoàn tiền đã bị từ chối')) {
            const parts = noteText.split('đã bị từ chối');
            if (parts.length > 1) {
                const reasonPart = parts[1].replace(/^[.:\s]+/, '').trim();
                if (reasonPart) {
                    rejectionReason = reasonPart;
                }
            }
        }
    }

    return (
        <div className={cx('page')}>
            <div className={cx('container')}>
                {/* Header */}
                <div className={cx('header')}>
                    <h1 className={cx('page-title')}>Chi tiết yêu cầu trả hàng/ hoàn tiền</h1>
                    <button className={cx('dashboard-btn')} onClick={() => navigate('/customer-support/refund-management')}>
                        ← Dashboard
                    </button>
                </div>

                {/* Order Code */}
                <div className={cx('order-code')}>
                    Đơn hàng #{order.code || order.id}
                </div>

                {/* Rejection Reason Alert (only show if order was rejected) - Hiển thị ở trên cùng */}
                {isRejected && rejectionReason && (
                    <div className={cx('rejection-alert')}>
                        <div className={cx('alert-header')}>
                            <span className={cx('alert-icon')}>⚠️</span>
                            <h3 className={cx('alert-title')}>Lý do từ chối</h3>
                        </div>
                        <p className={cx('alert-message')}>{rejectionReason}</p>
                    </div>
                )}

                {/* Customer Information */}
                <div className={cx('section')}>
                    <h2 className={cx('section-title')}>Thông tin khách hàng</h2>
                    <div className={cx('info-grid')}>
                        <div className={cx('info-item')}>
                            <label className={cx('info-label')}>Họ tên</label>
                            <input
                                type="text"
                                className={cx('info-input')}
                                value={shippingInfo?.name || order.receiverName || order.customerName || ''}
                                readOnly
                            />
                        </div>
                        <div className={cx('info-item')}>
                            <label className={cx('info-label')}>SĐT</label>
                            <input
                                type="text"
                                className={cx('info-input')}
                                value={shippingInfo?.phone || order.receiverPhone || ''}
                                readOnly
                            />
                        </div>
                        <div className={cx('info-item', 'full-width')}>
                            <label className={cx('info-label')}>Địa chỉ</label>
                            <input
                                type="text"
                                className={cx('info-input')}
                                value={shippingInfo?.address || order.shippingAddress || ''}
                                readOnly
                            />
                        </div>
                    </div>
                </div>

                {/* Refund Reason */}
                <div className={cx('section')}>
                    <h2 className={cx('section-title')}>Lý do trả hàng / hoàn tiền</h2>
                    <div className={cx('reason-cards')}>
                        <div className={cx('reason-card', { selected: refundInfo.reasonType === 'store' })}>
                            <h3 className={cx('reason-title')}>Sản phẩm gặp sự cố từ cửa hàng</h3>
                            <p className={cx('reason-desc')}>
                                Sản phẩm có lỗi kỹ thuật, thiếu trang, bị hỏng do đóng gói, hoặc thông tin hiển thị không đúng.
                            </p>
                            <button className={cx('reason-badge', 'free')}>Miễn phí trả hàng</button>
                        </div>

                        <div className={cx('reason-card', { selected: refundInfo.reasonType === 'customer' })}>
                            <h3 className={cx('reason-title')}>Thay đổi nhu cầu / Mua nhầm</h3>
                            <p className={cx('reason-desc')}>
                                Khách hàng muốn đổi phiên bản, đặt nhầm, hoặc thay đổi nhu cầu sử dụng sản phẩm.
                            </p>
                            <button className={cx('reason-badge', 'paid')}>Khách hỗ trợ phí trả hàng</button>
                        </div>
                    </div>
                </div>

                {/* Customer Submitted Request */}
                <div className={cx('section')}>
                    <h2 className={cx('section-title')}>Thông tin & ảnh khách gửi</h2>

                    {/* Product Details */}
                    {selectedItems.length > 0 && (
                        <div className={cx('product-details')}>
                            <div className={cx('detail-row')}>
                                <span className={cx('detail-label')}>Sản phẩm:</span>
                                <span className={cx('detail-value')}>
                                    {selectedItems.map(item => item.name || 'N/A').join(', ')}
                                </span>
                            </div>
                            <div className={cx('detail-row')}>
                                <span className={cx('detail-label')}>Số lượng:</span>
                                <span className={cx('detail-value')}>
                                    {selectedItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                                </span>
                            </div>
                            <div className={cx('summary-block')}>
                                <div className={cx('summary-row')}>
                                    <span>Tổng đơn (đã thanh toán)</span>
                                    <span>{formatCurrency(summary.totalPaid)}</span>
                                </div>
                                <div className={cx('summary-row')}>
                                    <span>Giá trị sản phẩm</span>
                                    <span>{formatCurrency(summary.productValue)}</span>
                                </div>
                                <div className={cx('summary-row')}>
                                    <span>Phí vận chuyển (lần đầu)</span>
                                    <span>{formatCurrency(summary.shippingFee)}</span>
                                </div>
                                <div className={cx('summary-row')}>
                                    <span>Phí ship (lần 2 - khách tạm ứng)</span>
                                    <span>{formatCurrency(summary.secondShippingFee)}</span>
                                </div>
                                <div className={cx('summary-row')}>
                                    <span>Phí hoàn trả (10% khi lỗi khách hàng)</span>
                                    <span>{formatCurrency(summary.returnPenalty)}</span>
                                </div>
                                <div className={cx('summary-row', 'total')}>
                                    <span>Tổng hoàn (theo khách đề xuất)</span>
                                    <span>{formatCurrency(summary.total)}</span>
                                </div>
                                {hasStaffConfirmed && (
                                    <div className={cx('summary-row', 'confirmed')}>
                                        <span>Tổng hoàn (nhân viên xác nhận)</span>
                                        <span>{formatCurrency(summary.confirmedTotal)}</span>
                                    </div>
                                )}
                            </div>
                            <div className={cx('detail-row')}>
                                <span className={cx('detail-label')}>Lý do:</span>
                                <span className={cx('detail-value')}>
                                    {refundInfo.description || refundInfo.reason || 'N/A'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Attached Media */}
                    <div className={cx('media-section')}>
                        <label className={cx('media-label')}>Ảnh khách gửi</label>
                        <div className={cx('media-boxes')}>
                            {normalizedMediaUrls.length > 0 ? (
                                normalizedMediaUrls.map((url, index) => {
                                    const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i.test(url);
                                    return (
                                        <div key={index} className={cx('media-box')}>
                                            {isVideo ? (
                                                <video
                                                    src={url}
                                                    controls
                                                    className={cx('media-content')}
                                                    preload="metadata"
                                                    onClick={() => handleImageClick(index)}
                                                    style={{ cursor: 'pointer' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        const errorDiv = document.createElement('div');
                                                        errorDiv.className = cx('media-placeholder');
                                                        errorDiv.textContent = `Ảnh ${index + 1}`;
                                                        e.target.parentElement.appendChild(errorDiv);
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    src={url}
                                                    alt={`Ảnh ${index + 1}`}
                                                    className={cx('media-content')}
                                                    loading="lazy"
                                                    onClick={() => handleImageClick(index)}
                                                    style={{ cursor: 'pointer' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        const errorDiv = document.createElement('div');
                                                        errorDiv.className = cx('media-placeholder');
                                                        errorDiv.textContent = `Ảnh ${index + 1}`;
                                                        e.target.parentElement.appendChild(errorDiv);
                                                    }}
                                                />
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                // Show placeholder boxes if no media
                                [1, 2, 3].map((num) => (
                                    <div key={num} className={cx('media-box', 'placeholder')}>
                                        <span className={cx('media-placeholder')}>Ảnh {num}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Rejection Note */}
                <div className={cx('section')}>
                    <h2 className={cx('section-title')}>Ghi chú / lý do nếu không hợp lệ</h2>
                    <textarea
                        className={cx('rejection-textarea')}
                        value={rejectionNote}
                        onChange={(e) => setRejectionNote(e.target.value)}
                        placeholder="Nhập ghi chú hoặc lý do từ chối yêu cầu hoàn tiền (nếu có)..."
                        rows={6}
                    />
                </div>

                {/* Action Buttons */}
                <div className={cx('action-buttons')}>
                    <button
                        className={cx('btn', 'btn-cancel')}
                        onClick={handleCancel}
                        disabled={processing}
                    >
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
                        {processing ? 'Đang xử lý...' : 'Xác nhận đơn'}
                    </button>
                </div>
            </div>

            {/* Lightbox Modal */}
            {lightboxOpen && normalizedMediaUrls.length > 0 && (
                <div className={cx('lightbox')} onClick={handleCloseLightbox}>
                    <button className={cx('lightbox-close')} onClick={handleCloseLightbox}>
                        ×
                    </button>
                    {normalizedMediaUrls.length > 1 && (
                        <>
                            <button className={cx('lightbox-nav', 'lightbox-prev')} onClick={handlePrevImage}>
                                ‹
                            </button>
                            <button className={cx('lightbox-nav', 'lightbox-next')} onClick={handleNextImage}>
                                ›
                            </button>
                        </>
                    )}
                    <div className={cx('lightbox-content')} onClick={(e) => e.stopPropagation()}>
                        {(() => {
                            const currentUrl = normalizedMediaUrls[lightboxIndex];
                            const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i.test(currentUrl);
                            return isVideo ? (
                                <video
                                    src={currentUrl}
                                    controls
                                    autoPlay
                                    className={cx('lightbox-media')}
                                >
                                    Trình duyệt của bạn không hỗ trợ video.
                                </video>
                            ) : (
                                <img
                                    src={currentUrl}
                                    alt={`Ảnh ${lightboxIndex + 1}`}
                                    className={cx('lightbox-media')}
                                />
                            );
                        })()}
                        {normalizedMediaUrls.length > 1 && (
                            <div className={cx('lightbox-counter')}>
                                {lightboxIndex + 1} / {normalizedMediaUrls.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
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
            <RejectOrderRefundDialog
                open={rejectDialog}
                onConfirm={handleConfirmReject}
                onCancel={() => setRejectDialog(false)}
                loading={processing}
            />
        </div>
    );
}
