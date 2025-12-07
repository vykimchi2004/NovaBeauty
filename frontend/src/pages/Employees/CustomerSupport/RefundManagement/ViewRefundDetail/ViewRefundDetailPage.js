import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './ViewRefundDetailPage.module.scss';
import { getApiBaseUrl, getStoredToken, formatCurrency } from '~/services/utils';
import { normalizeMediaUrl } from '~/services/productUtils';

const cx = classNames.bind(styles);

// Parse refund information from order
const parseRefundInfo = (order) => {
    if (!order) {
        return {
            reasonType: '',
            description: '',
            refundAmount: 0,
            selectedProductIds: [],
            mediaUrls: [],
            email: '',
            returnAddress: '',
            refundMethod: '',
            bank: '',
            accountNumber: '',
            accountHolder: '',
        };
    }

    let mediaUrls = [];
    if (order.refundMediaUrls) {
        try {
            let parsed = order.refundMediaUrls;
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            if (Array.isArray(parsed)) {
                mediaUrls = parsed;
            }
        } catch (e) {
            console.warn('Failed to parse refund media URLs', e);
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
        } catch (e) {
            console.warn('Failed to parse refund selected product IDs', e);
            selectedProductIds = [];
        }
    }

    return {
        reasonType: order.refundReasonType || '',
        description: order.refundDescription || '',
        refundAmount: order.refundAmount || 0,
        mediaUrls,
        selectedProductIds,
        email: order.refundEmail || order.customerEmail || '',
        returnAddress: order.refundReturnAddress || '',
        refundMethod: order.refundMethod || '',
        bank: order.refundBank || '',
        accountNumber: order.refundAccountNumber || '',
        accountHolder: order.refundAccountHolder || '',
    };
};

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

    const productValue = selectedItems.reduce(
        (sum, item) => sum + Number(item.totalPrice || item.finalPrice || 0),
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

    const total = order.refundAmount ?? fallbackTotal;
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

export default function ViewRefundDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const apiBaseUrl = getApiBaseUrl();

    useEffect(() => {
        const fetchOrderDetail = async () => {
            try {
                setLoading(true);
                setError('');
                const token = getStoredToken('token');
                if (!token) {
                    setError('Vui lòng đăng nhập để xem chi tiết đơn hoàn hàng');
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
                const orderData = data?.result || data;

                if (!orderData || !orderData.id) {
                    throw new Error('Dữ liệu đơn hàng không hợp lệ');
                }

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
    }, [id, apiBaseUrl]);

    const refundInfo = useMemo(() => parseRefundInfo(order), [order]);
    const shippingInfo = useMemo(() => parseShippingInfo(order?.shippingAddress), [order]);

    const selectedItems = useMemo(() => {
        if (!order?.items) return [];
        if (!refundInfo.selectedProductIds.length) return order.items;
        return order.items.filter((item) => refundInfo.selectedProductIds.includes(item.id));
    }, [order?.items, refundInfo.selectedProductIds]);

    const summary = useMemo(
        () => buildRefundSummary(order, refundInfo, selectedItems),
        [order, refundInfo, selectedItems],
    );

    const normalizedMediaUrls = useMemo(() => {
        if (!refundInfo.mediaUrls || !refundInfo.mediaUrls.length) return [];
        const baseUrlForStatic = apiBaseUrl.replace('/api', '');
        return refundInfo.mediaUrls.map((url) => normalizeMediaUrl(url, baseUrlForStatic));
    }, [apiBaseUrl, refundInfo.mediaUrls]);

    const handleBack = () => {
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

    const getReasonLabel = (reasonType) => {
        switch (reasonType) {
            case 'store':
                return 'Sản phẩm gặp sự cố từ cửa hàng';
            case 'customer':
                return 'Thay đổi nhu cầu / Mua nhầm';
            default:
                return 'Chưa xác định';
        }
    };

    const orderStatus = order?.status || '';
    const normalizedStatus = (orderStatus || '').toUpperCase();
    const hasStaffConfirmed =
        (normalizedStatus === 'RETURN_STAFF_CONFIRMED' || normalizedStatus === 'REFUNDED') &&
        typeof order?.refundConfirmedAmount === 'number' &&
        order.refundConfirmedAmount > 0;

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

    return (
        <div className={cx('page')}>
            <div className={cx('container')}>
                {/* Header */}
                <div className={cx('header')}>
                    <h1 className={cx('page-title')}>Chi tiết đơn hoàn hàng (khách hàng gửi)</h1>
                    <button className={cx('dashboard-btn')} onClick={handleBack}>
                        ← Quay lại
                    </button>
                </div>

                {/* Order Code */}
                <div className={cx('order-code')}>
                    Đơn hàng #{order.code || order.id}
                </div>

                {/* Rejection Reason Alert (only show if order was rejected) */}
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

                {/* Customer Submitted Request - Chi tiết đơn hoàn hàng khách hàng gửi */}
                <div className={cx('section')}>
                    <h2 className={cx('section-title')}>Chi tiết đơn hoàn hàng (khách hàng gửi)</h2>
                    
                    <div className={cx('request-box')}>
                        {/* Product Details */}
                        <div className={cx('request-row')}>
                            <span>Sản phẩm:</span>
                            <span>
                                {selectedItems.length > 0
                                    ? selectedItems.map(item => item.name || 'N/A').join(', ')
                                    : 'Không xác định'}
                            </span>
                        </div>
                        <div className={cx('request-row')}>
                            <span>Số lượng:</span>
                            <span>
                                {selectedItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                            </span>
                        </div>
                        <div className={cx('request-row')}>
                            <span>Lý do:</span>
                            <span>{refundInfo.description || getReasonLabel(refundInfo.reasonType) || 'Không có mô tả'}</span>
                        </div>

                        {/* Refund Summary */}
                        <div className={cx('summary-block')}>
                            <div className={cx('summary-title')}>Tóm tắt số tiền hoàn</div>
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

                        {/* Refund Method Info */}
                        {refundInfo.refundMethod && (
                            <>
                                <div className={cx('request-row')}>
                                    <span>Phương thức hoàn tiền:</span>
                                    <span>{refundInfo.refundMethod}</span>
                                </div>
                                {refundInfo.bank && (
                                    <div className={cx('request-row')}>
                                        <span>Ngân hàng:</span>
                                        <span>{refundInfo.bank}</span>
                                    </div>
                                )}
                                {refundInfo.accountNumber && (
                                    <div className={cx('request-row')}>
                                        <span>Số tài khoản:</span>
                                        <span>{refundInfo.accountNumber}</span>
                                    </div>
                                )}
                                {refundInfo.accountHolder && (
                                    <div className={cx('request-row')}>
                                        <span>Chủ tài khoản:</span>
                                        <span>{refundInfo.accountHolder}</span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Return Address */}
                        {refundInfo.returnAddress && (
                            <div className={cx('request-row')}>
                                <span>Địa chỉ gửi hàng:</span>
                                <span>{refundInfo.returnAddress}</span>
                            </div>
                        )}

                        {/* Attached Media */}
                        <div>
                            <div className={cx('media-label')}>Ảnh khách gửi</div>
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
        </div>
    );
}

