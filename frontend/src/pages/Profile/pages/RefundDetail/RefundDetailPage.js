import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './RefundDetailPage.module.scss';
import { getApiBaseUrl, getStoredToken, formatCurrency } from '~/services/utils';
import { normalizeMediaUrl } from '~/services/productUtils';

const cx = classNames.bind(styles);

// Parse refund information from order (prefer dedicated fields, fallback to note)
export const parseRefundInfo = (order) => {
    // First, try to get from dedicated refund fields (new way)
    if (order.refundReasonType || order.refundDescription || order.refundReturnAddress) {
        let selectedProducts = [];
        if (order.refundSelectedProductIds) {
            try {
                selectedProducts = JSON.parse(order.refundSelectedProductIds);
            } catch {
                selectedProducts = order.items?.map(item => item.id) || [];
            }
        } else {
            selectedProducts = order.items?.map(item => item.id) || [];
        }

        let mediaUrls = [];
        if (order.refundMediaUrls) {
            try {
                const parsed = JSON.parse(order.refundMediaUrls);
                if (Array.isArray(parsed)) {
                    mediaUrls = parsed;
                }
            } catch (e) {
                console.warn('Failed to parse refund media URLs', e);
            }
        }

        return {
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
    }

    // Fallback: parse from note
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

    if (note.includes('Sản phẩm gặp sự cố từ cửa hàng')) {
        info.reason = 'Sản phẩm gặp sự cố từ cửa hàng';
        info.reasonType = 'store';
    } else if (note.includes('Thay đổi nhu cầu / Mua nhầm')) {
        info.reason = 'Thay đổi nhu cầu / Mua nhầm';
        info.reasonType = 'customer';
    }

    const descMatch = note.match(/Mô tả:\s*(.+?)(?:\n|$)/);
    if (descMatch) {
        info.description = descMatch[1].trim();
    }

    const emailMatch = note.match(/Email:\s*(.+?)(?:\n|$)/);
    if (emailMatch) {
        info.email = emailMatch[1].trim();
    }

    const addressMatch = note.match(/Địa chỉ gửi hàng:\s*(.+?)(?:\n|$)/);
    if (addressMatch) {
        info.returnAddress = addressMatch[1].trim();
    }

    const methodMatch = note.match(/Phương thức hoàn tiền:\s*(.+?)(?:\n|$)/);
    if (methodMatch) {
        info.refundMethod = methodMatch[1].trim();
    }

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

export const calculateRefund = (order, refundInfo) => {
    if (!order || !order.items) {
        return {
            productValue: 0,
            shippingFee: 0,
            secondShippingFee: 0,
            returnPenalty: 0,
            total: refundInfo.refundAmount ?? order?.refundAmount ?? 0,
            totalPaid: order?.refundTotalPaid ?? 0,
        };
    }

    const selectedItems = order.items.filter((item) =>
        refundInfo.selectedProducts.includes(item.id),
    );
    const shippingFee = order.shippingFee || 0;
    const totalPaid = order.refundTotalPaid ?? order.totalAmount ?? 0;
    
    // Tính giá trị sản phẩm ban đầu (chưa có voucher)
    const rawProductValue = selectedItems.reduce(
        (sum, item) => sum + (item.totalPrice || item.finalPrice || 0),
        0,
    );
    
    // Nếu có voucher (totalPaid khác với rawProductValue + shippingFee), 
    // thì giá trị sản phẩm = totalPaid - shippingFee
    // Nếu không có voucher, giữ nguyên giá trị sản phẩm ban đầu
    const productValue = totalPaid > 0 && Math.abs(totalPaid - (rawProductValue + shippingFee)) > 0.01
        ? Math.max(0, totalPaid - shippingFee)
        : rawProductValue;

    const estimatedReturnShippingFee = [
        order.refundSecondShippingFee,
        refundInfo.returnFee,
        order.refundReturnFee,
        order.estimatedReturnShippingFee,
        order.shippingFee,
    ].find((val) => typeof val === 'number') ?? 0;
    const secondShippingFee = Math.max(0, Math.round(estimatedReturnShippingFee));

    const storedPenalty = order.refundPenaltyAmount;
    const returnPenalty =
        typeof storedPenalty === 'number'
            ? storedPenalty
            : refundInfo.reasonType === 'customer'
                ? Math.max(0, Math.round(productValue * 0.1))
                : 0;

    const storedTotal = refundInfo.refundAmount ?? order.refundAmount;
    const total =
        typeof storedTotal === 'number'
            ? storedTotal
            : refundInfo.reasonType === 'store'
                ? totalPaid + secondShippingFee
                : Math.max(0, totalPaid - secondShippingFee - returnPenalty);

    return {
        productValue,
        shippingFee,
        secondShippingFee,
        returnPenalty,
        total,
        totalPaid,
    };
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateString;
    }
};

const getStatusLabel = (status) => {
    const statusMap = {
        RETURN_REQUESTED: 'Khách hàng yêu cầu hoàn tiền/ trả hàng',
        RETURN_CS_CONFIRMED: 'CSKH đang xử lý',
        RETURN_STAFF_CONFIRMED: 'Nhân viên xác nhận hàng',
        REFUNDED: 'Hoàn tiền thành công',
        RETURN_REJECTED: 'Từ chối hoàn tiền/ trả hàng',
    };
    return statusMap[status] || status || '';
};

export default function RefundDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedImagePreview, setSelectedImagePreview] = useState(null); // Ảnh/video đang được xem chi tiết

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
                
                // Debug log để kiểm tra dữ liệu từ API
                console.log('CustomerRefundDetailPage - Order Data from API:', {
                    id: orderData.id,
                    status: orderData.status,
                    refundRejectionReason: orderData.refundRejectionReason,
                    note: orderData.note,
                    rawData: orderData
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
    const refund = calculateRefund(order, refundInfo);

    // Normalize media URLs
    const apiBaseUrl = getApiBaseUrl();
    const baseUrlForStatic = apiBaseUrl.replace('/api', '');
    const normalizedMediaUrls = (refundInfo.mediaUrls || []).map(url => 
        normalizeMediaUrl(url, baseUrlForStatic)
    );

    // Check if order is rejected (case-insensitive) - kiểm tra cả status và rawStatus
    const orderStatus = order?.status || order?.rawStatus || '';
    const statusStr = String(orderStatus).toUpperCase();
    const isRejected = statusStr === 'RETURN_REJECTED' || statusStr.includes('REJECTED');
    const rejectionSourceRaw = String(order?.refundRejectionSource || '').toUpperCase();
    const rejectionSourceLabel =
        rejectionSourceRaw === 'STAFF' ? 'Nhân viên xác nhận hàng' : 'CSKH';

    // Parse rejection reason từ nhiều nguồn
    let rejectionReason = order?.refundRejectionReason || 
                         order?.refund_rejection_reason || 
                         '';
    
    // Nếu không có refundRejectionReason, parse từ note
    if (!rejectionReason && order?.note) {
        const noteText = String(order.note);
        // Tìm pattern "Lý do: ..."
        const rejectionMatch = noteText.match(/Lý do:\s*(.+?)(?:\n|$)/i);
        if (rejectionMatch && rejectionMatch[1]) {
            rejectionReason = rejectionMatch[1].trim();
        } else if (noteText.includes('Yêu cầu hoàn tiền đã bị từ chối')) {
            // Nếu không có "Lý do:", lấy phần sau "đã bị từ chối"
            const parts = noteText.split('đã bị từ chối');
            if (parts.length > 1) {
                const reasonPart = parts[1].replace(/^[.:\s]+/, '').trim();
                if (reasonPart) {
                    rejectionReason = reasonPart;
                }
            }
        }
    }
    
    // Debug log để kiểm tra - luôn log để debug
    console.log('CustomerRefundDetailPage - Order Details:', {
        id: order?.id,
        status: order?.status,
        rawStatus: order?.rawStatus,
        orderStatus: orderStatus,
        statusStr: statusStr,
        isRejected: isRejected,
        refundRejectionReason: order?.refundRejectionReason,
        refund_rejection_reason: order?.refund_rejection_reason,
        note: order?.note,
        parsedRejectionReason: rejectionReason,
        fullOrder: order
    });

    return (
        <div className={cx('page')}>
            <div className={cx('container')}>
                <div className={cx('header')}>
                    <button className={cx('back-btn')} onClick={() => navigate(-1)}>
                        ← Quay lại
                    </button>
                    <h1 className={cx('page-title')}>Chi tiết yêu cầu hoàn tiền/ trả hàng</h1>
                </div>

                {/* Rejection Reason Alert (only show if order was rejected) - Hiển thị ở trên cùng */}
                {isRejected ? (
                    <div className={cx('rejection-alert', 'top-alert')}>
                        <div className={cx('alert-header')}>
                            <span className={cx('alert-icon')}>⚠️</span>
                            <h3 className={cx('alert-title')}>
                                Lý do từ chối từ {rejectionSourceLabel}
                            </h3>
                        </div>
                        <p className={cx('alert-message')}>
                            {rejectionReason || 'Không có lý do từ chối được ghi lại.'}
                        </p>
                    </div>
                ) : null}

                {/* Order Info Summary */}
                <div className={cx('order-summary')}>
                    <div className={cx('summary-item')}>
                        <span className={cx('summary-label')}>Mã đơn hàng:</span>
                        <span className={cx('summary-value')}>#{order.code || order.id}</span>
                    </div>
                    <div className={cx('summary-item')}>
                        <span className={cx('summary-label')}>Ngày đặt:</span>
                        <span className={cx('summary-value')}>{formatDate(order.orderDateTime || order.orderDate)}</span>
                    </div>
                    <div className={cx('summary-item')}>
                        <span className={cx('summary-label')}>Trạng thái:</span>
                        <span className={cx('status-badge', order.status?.toLowerCase())}>
                            {getStatusLabel(order.status)}
                        </span>
                        {/* Debug: Show status value */}
                        {process.env.NODE_ENV === 'development' && (
                            <span style={{ fontSize: '12px', color: '#999', marginLeft: '10px' }}>
                                (Status: {order.status})
                            </span>
                        )}
                    </div>
                </div>

                {/* Refund Request Form (Read-only) */}
                <div className={cx('form')}>
                    <h2 className={cx('section-title')}>Yêu cầu trả hàng / hoàn tiền</h2>

                    {/* Reason Selection (Display) */}
                    <div className={cx('form-section')}>
                        <label className={cx('section-label')}>Lý do trả hàng / hoàn tiền</label>
                        <div className={cx('reason-cards')}>
                            <div className={cx('reason-card', { selected: refundInfo.reasonType === 'store' })}>
                                <h3 className={cx('reason-title')}>Sản phẩm gặp sự cố từ cửa hàng</h3>
                                <p className={cx('reason-desc')}>
                                    Sản phẩm có lỗi kỹ thuật, bị hỏng do đóng gói, hoặc thông tin hiển thị không đúng.
                                </p>
                                <button className={cx('reason-badge', 'free')}>Miễn phí trả hàng</button>
                            </div>

                            <div className={cx('reason-card', { selected: refundInfo.reasonType === 'customer' })}>
                                <h3 className={cx('reason-title')}>Thay đổi nhu cầu / Mua nhầm</h3>
                                <p className={cx('reason-desc')}>
                                    Khách hàng đặt nhầm, hoặc thay đổi nhu cầu sử dụng sản phẩm.
                                </p>
                                <button className={cx('reason-badge', 'paid')}>Khách hỗ trợ phí trả hàng</button>
                            </div>
                        </div>
                    </div>

                    {/* Chi tiết đơn hoàn hàng (khách hàng gửi) */}
                    <div className={cx('form-section')}>
                        <label className={cx('section-label')}>Chi tiết đơn hoàn hàng (khách hàng gửi)</label>
                        <div className={cx('request-box')}>
                            {/* Product Details */}
                            <div className={cx('request-row')}>
                                <span>Sản phẩm:</span>
                                <span>
                                    {order.items && order.items.length > 0
                                        ? order.items
                                              .filter((item) => refundInfo.selectedProducts.includes(item.id))
                                              .map((item) => item.name || 'N/A')
                                              .join(', ') || 'Không xác định'
                                        : 'Không xác định'}
                                </span>
                            </div>
                            <div className={cx('request-row')}>
                                <span>Số lượng:</span>
                                <span>
                                    {order.items && order.items.length > 0
                                        ? order.items
                                              .filter((item) => refundInfo.selectedProducts.includes(item.id))
                                              .reduce((sum, item) => sum + (item.quantity || 0), 0)
                                        : 0}
                                </span>
                            </div>
                            <div className={cx('request-row')}>
                                <span>Lý do:</span>
                                <span>{refundInfo.description || refundInfo.reason || 'Không có mô tả'}</span>
                            </div>

                            {/* Refund Summary */}
                            <div className={cx('summary-block')}>
                                <div className={cx('summary-title')}>Tóm tắt số tiền hoàn</div>
                                <div className={cx('summary-row')}>
                                    <span>Tổng đơn (đã thanh toán)</span>
                                    <span>{formatCurrency(refund.totalPaid)}</span>
                                </div>
                                <div className={cx('summary-row')}>
                                    <span>Giá trị sản phẩm</span>
                                    <span>{formatCurrency(refund.productValue)}</span>
                                </div>
                                <div className={cx('summary-row')}>
                                    <span>Phí vận chuyển (lần đầu)</span>
                                    <span>{formatCurrency(refund.shippingFee)}</span>
                                </div>
                                <div className={cx('summary-row')}>
                                    <span>Phí ship (lần 2 - khách tạm ứng)</span>
                                    <span>{formatCurrency(refund.secondShippingFee)}</span>
                                </div>
                                <div className={cx('summary-row')}>
                                    <span>Phí hoàn trả (10% khi lỗi khách hàng)</span>
                                    <span>{formatCurrency(refund.returnPenalty)}</span>
                                </div>
                                <div className={cx('summary-row', 'total')}>
                                    <span>Tổng hoàn (theo khách đề xuất)</span>
                                    <span>{formatCurrency(refund.total)}</span>
                                </div>
                                {order.refundConfirmedAmount && (
                                    <div className={cx('summary-row', 'confirmed')}>
                                        <span>Tổng hoàn (nhân viên xác nhận)</span>
                                        <span>{formatCurrency(order.refundConfirmedAmount)}</span>
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
                        </div>
                    </div>

                    {/* Attached Media */}
                    {normalizedMediaUrls.length > 0 && (
                        <div className={cx('form-section')}>
                            <label className={cx('section-label')}>Ảnh / Video đính kèm</label>
                            <p className={cx('media-hint')}>
                                Bạn đã đính kèm {normalizedMediaUrls.length} {normalizedMediaUrls.length === 1 ? 'tệp' : 'tệp'} làm bằng chứng
                            </p>
                            <div className={cx('media-previews')}>
                                {normalizedMediaUrls.map((url, index) => {
                                    const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i.test(url);
                                    const mediaItem = {
                                        url: url,
                                        name: isVideo ? `Video ${index + 1}` : `Ảnh ${index + 1}`,
                                        isVideo: isVideo
                                    };
                                    return (
                                        <div key={index} className={cx('media-preview-item')}>
                                            {isVideo ? (
                                                <video 
                                                    src={url} 
                                                    controls
                                                    className={cx('preview-media')}
                                                    preload="metadata"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedImagePreview(mediaItem);
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                    onError={(e) => {
                                                        console.error('Error loading video:', url, e);
                                                        e.target.style.display = 'none';
                                                        const errorDiv = document.createElement('div');
                                                        errorDiv.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100%; color: #999;';
                                                        errorDiv.textContent = 'Không thể tải video';
                                                        e.target.parentElement.appendChild(errorDiv);
                                                    }}
                                                >
                                                    Trình duyệt của bạn không hỗ trợ video.
                                                </video>
                                            ) : (
                                                <img 
                                                    src={url} 
                                                    alt={`Bằng chứng ${index + 1}`}
                                                    className={cx('preview-media')}
                                                    loading="lazy"
                                                    onClick={() => setSelectedImagePreview(mediaItem)}
                                                    style={{ cursor: 'pointer' }}
                                                    onError={(e) => {
                                                        console.error('Error loading image:', url, e);
                                                        e.target.style.display = 'none';
                                                        const errorDiv = document.createElement('div');
                                                        errorDiv.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100%; color: #999;';
                                                        errorDiv.textContent = 'Không thể tải ảnh';
                                                        e.target.parentElement.appendChild(errorDiv);
                                                    }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Contact Email */}
                    <div className={cx('form-section')}>
                        <label className={cx('section-label')}>Email liên hệ</label>
                        <div className={cx('input', 'readonly')}>
                            {refundInfo.email || order.customerEmail || 'N/A'}
                        </div>
                    </div>

                    {/* Return Address */}
                    <div className={cx('form-section')}>
                        <label className={cx('section-label')}>Địa chỉ gửi hàng</label>
                        <div className={cx('input', 'readonly')}>
                            {refundInfo.returnAddress || 'N/A'}
                        </div>
                    </div>

                    {/* Refund Method */}
                    <div className={cx('form-section')}>
                        <label className={cx('section-label')}>Hình thức hoàn tiền</label>
                        <div className={cx('select', 'readonly')}>
                            {refundInfo.refundMethod || 'N/A'}
                        </div>

                        {refundInfo.bank && (
                            <div className={cx('bank-details')}>
                                <div className={cx('select', 'readonly')}>
                                    {refundInfo.bank}
                                </div>
                                <div className={cx('input', 'readonly')}>
                                    {refundInfo.accountNumber}
                                </div>
                                <div className={cx('input', 'readonly')}>
                                    {refundInfo.accountHolder}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className={cx('form-section', 'summary-section')}>
                        <label className={cx('section-label')}>Tóm tắt hoàn tiền</label>
                        <div className={cx('summary-list')}>
                            <div className={cx('summary-row')}>
                                <span>Tổng đơn (đã thanh toán)</span>
                                <span>{formatCurrency(refund.totalPaid)}</span>
                            </div>
                            <div className={cx('summary-row')}>
                                <span>Giá trị sản phẩm</span>
                                <span>{formatCurrency(refund.productValue)}</span>
                            </div>
                            <div className={cx('summary-row')}>
                                <span>Phí vận chuyển (lần đầu)</span>
                                <span>{formatCurrency(refund.shippingFee)}</span>
                            </div>
                            <div className={cx('summary-row')}>
                                <span>Phí ship (lần 2 - khách tạm ứng)</span>
                                <span>{formatCurrency(refund.secondShippingFee)}</span>
                            </div>
                            <div className={cx('summary-row')}>
                                <span>Phí hoàn trả (10% khi lỗi khách hàng)</span>
                                <span>{formatCurrency(refund.returnPenalty)}</span>
                            </div>
                            <div className={cx('summary-row', 'total')}>
                                <span>Tổng hoàn</span>
                                <span>{formatCurrency(refund.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Button for Rejected Status */}
                    {isRejected && (
                        <div className={cx('form-section', 'action-section')}>
                            <button 
                                className={cx('resubmit-btn')}
                                onClick={() => {
                                    // Navigate to refund request page with order ID
                                    // The RefundRequestPage will load existing data if available
                                    navigate(`/customer-account/orders/${order.id}/refund-request`);
                                }}
                            >
                                Sửa lại và gửi lại yêu cầu
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Image Preview Modal */}
            {selectedImagePreview && (
                <div className={cx('image-modal')} onClick={() => setSelectedImagePreview(null)}>
                    <div className={cx('image-modal-content')} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={cx('image-modal-close')}
                            onClick={() => setSelectedImagePreview(null)}
                        >
                            ×
                        </button>
                        {selectedImagePreview.isVideo ? (
                            <video 
                                src={selectedImagePreview.url} 
                                controls
                                autoPlay
                                className={cx('image-modal-media')}
                            >
                                Trình duyệt của bạn không hỗ trợ video.
                            </video>
                        ) : (
                            <img 
                                src={selectedImagePreview.url} 
                                alt={selectedImagePreview.name}
                                className={cx('image-modal-image')}
                            />
                        )}
                        <p className={cx('image-modal-name')}>{selectedImagePreview.name}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

