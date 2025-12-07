import React, { useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';
import refundStyles from '../pages/RefundDetail/RefundDetailPage.module.scss';
import { formatCurrency, getApiBaseUrl } from '~/services/utils';
import { normalizeMediaUrl } from '~/services/productUtils';
import defaultProductImage from '~/assets/images/products/image1.jpg';
import { parseRefundInfo, calculateRefund } from '../pages/RefundDetail/RefundDetailPage.js';
import CancelOrderDialog from '~/components/Common/ConfirmDialog/CancelOrderDialog';
import orderService from '~/services/order';
import { useNotification } from '~/components/Common/Notification';

const refundCx = classNames.bind(refundStyles);

// Helper functions from RefundDetailPage
const formatDate = (dateString) => {
    if (!dateString) return '—';
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
        RETURN_REJECTED: 'Hủy',
    };
    return statusMap[status] || status || '';
};

function RefundOrderModal({ order, loading, onClose, error, onSuccess }) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxUrls, setLightboxUrls] = useState([]);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const { success: notifySuccess, error: notifyError } = useNotification();

    // Hooks must be called at top level, not conditionally
    const refundInfo = useMemo(() => {
        if (!order) {
            console.log('RefundOrderModal: No order data');
            return {
                reason: '',
                reasonType: null,
                description: '',
                returnAddress: '',
                refundMethod: '',
                bank: '',
                accountNumber: '',
                accountHolder: '',
                selectedProducts: [],
                refundAmount: null,
                mediaUrls: [],
            };
        }
        const parsed = parseRefundInfo(order);
        console.log('RefundOrderModal: Parsed refund info:', {
            orderNote: order.note,
            parsed,
            orderFields: {
                refundReasonType: order.refundReasonType,
                refundDescription: order.refundDescription,
                refundReturnAddress: order.refundReturnAddress,
                refundMethod: order.refundMethod,
                refundMediaUrls: order.refundMediaUrls,
            }
        });
        return parsed;
    }, [order]);
    
    const refund = useMemo(() => {
        if (!order) return {
            productValue: 0,
            shippingFee: 0,
            secondShippingFee: 0,
            returnPenalty: 0,
            total: 0,
            totalPaid: 0,
        };
        return calculateRefund(order, refundInfo);
    }, [order, refundInfo]);
    
    // Normalize media URLs
    const apiBaseUrl = getApiBaseUrl();
    const baseUrlForStatic = apiBaseUrl.replace('/api', '');
    const normalizedMediaUrls = useMemo(() => {
        return (refundInfo.mediaUrls || []).map(url =>
            normalizeMediaUrl(url, baseUrlForStatic)
        );
    }, [refundInfo.mediaUrls, baseUrlForStatic]);

    // Always render modal if it's open (handled by parent component)
    // Don't return null here to ensure modal structure is always rendered
    console.log('RefundOrderModal: Rendering', { 
        hasOrder: !!order, 
        loading, 
        refundInfo: refundInfo ? {
            reasonType: refundInfo.reasonType,
            description: refundInfo.description,
            returnAddress: refundInfo.returnAddress,
            refundMethod: refundInfo.refundMethod,
            mediaUrlsCount: refundInfo.mediaUrls?.length || 0
        } : null
    });

    // Check if order is rejected
    const orderStatus = order?.status || order?.rawStatus || '';
    const statusStr = String(orderStatus).toUpperCase();
    const isRejected = statusStr === 'RETURN_REJECTED' || statusStr.includes('REJECTED');
    const rejectionSourceRaw = String(order?.refundRejectionSource || '').toUpperCase();
    const rejectionSourceLabel =
        rejectionSourceRaw === 'STAFF' ? 'Nhân viên xác nhận hàng' : 'CSKH';

    // Parse rejection reason
    let rejectionReason = order?.refundRejectionReason || 
                         order?.refund_rejection_reason || 
                         '';
    
    if (!rejectionReason && order?.note) {
        const noteText = String(order.note);
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

    const handleCancelOrder = async (reason) => {
        if (!order?.id) return;
        try {
            setCancelling(true);
            const { ok } = await orderService.cancelOrder(order.id, reason);
            if (ok) {
                notifySuccess('Đã hủy đơn hàng thành công.');
                if (onSuccess) {
                    onSuccess();
                }
                onClose();
            } else {
                notifyError('Không thể hủy đơn hàng. Vui lòng thử lại.');
            }
        } catch (err) {
            console.error('Error cancelling order:', err);
            notifyError(err.message || 'Có lỗi xảy ra khi hủy đơn hàng.');
        } finally {
            setCancelling(false);
            setShowCancelDialog(false);
        }
    };

    return (
        <>
            <div className={refundCx('modal-overlay')} onClick={onClose}>
                <div className={refundCx('modal-content')} onClick={(e) => e.stopPropagation()}>
                    <div className={refundCx('modal-header')}>
                        <h2 className={refundCx('modal-title')}>Chi tiết yêu cầu hoàn tiền/ trả hàng</h2>
                        <button
                            type="button"
                            className={refundCx('modal-close')}
                            onClick={onClose}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    <div className={refundCx('modal-body')}>
                        {loading ? (
                            <div className={refundCx('loading')}>Đang tải thông tin...</div>
                        ) : error || !order ? (
                            <div className={refundCx('error')}>
                                <p>{error || 'Không tìm thấy thông tin đơn hàng'}</p>
                                <button onClick={onClose}>Đóng</button>
                            </div>
                        ) : (
                            <div className={refundCx('refund-detail-content')}>
                                {/* Rejection Alert */}
                                {isRejected && (
                                    <div className={refundCx('rejection-alert', 'top-alert')}>
                                        <div className={refundCx('alert-header')}>
                                            <span className={refundCx('alert-icon')}>⚠️</span>
                                            <h3 className={refundCx('alert-title')}>
                                                Lý do từ chối từ {rejectionSourceLabel}
                                            </h3>
                                        </div>
                                        <p className={refundCx('alert-message')}>
                                            {rejectionReason || 'Không có lý do từ chối được ghi lại.'}
                                        </p>
                                    </div>
                                )}

                                {/* Order Summary */}
                                <div className={refundCx('order-summary')}>
                                    <div className={refundCx('summary-item')}>
                                        <span className={refundCx('summary-label')}>Mã đơn hàng:</span>
                                        <span className={refundCx('summary-value')}>#{order.code || order.id}</span>
                                    </div>
                                    <div className={refundCx('summary-item')}>
                                        <span className={refundCx('summary-label')}>Ngày đặt:</span>
                                        <span className={refundCx('summary-value')}>
                                            {formatDate(order.orderDateTime || order.orderDate)}
                                        </span>
                                    </div>
                                    <div className={refundCx('summary-item')}>
                                        <span className={refundCx('summary-label')}>Trạng thái:</span>
                                        <span className={refundCx('status-badge', (order.rawStatus || order.status)?.toLowerCase())}>
                                            {getStatusLabel(order.rawStatus || order.status)}
                                        </span>
                                    </div>
                                </div>

                                {/* Refund Request Form (Read-only) */}
                                <div className={refundCx('form')}>
                                    <h2 className={refundCx('section-title')}>Yêu cầu trả hàng / hoàn tiền</h2>

                                    {/* Reason Selection (Display) */}
                                    <div className={refundCx('form-section')}>
                                        <label className={refundCx('section-label')}>Lý do trả hàng / hoàn tiền</label>
                                        <div className={refundCx('reason-cards')}>
                                            <div className={refundCx('reason-card', { selected: refundInfo.reasonType === 'store' })}>
                                                <h3 className={refundCx('reason-title')}>Sản phẩm gặp sự cố từ cửa hàng</h3>
                                                <p className={refundCx('reason-desc')}>
                                                    Sản phẩm có lỗi kỹ thuật, bị hỏng do đóng gói, hoặc thông tin hiển thị không đúng.
                                                </p>
                                                <button className={refundCx('reason-badge', 'free')}>Miễn phí trả hàng</button>
                                            </div>

                                            <div className={refundCx('reason-card', { selected: refundInfo.reasonType === 'customer' })}>
                                                <h3 className={refundCx('reason-title')}>Thay đổi nhu cầu / Mua nhầm</h3>
                                                <p className={refundCx('reason-desc')}>
                                                    Khách hàng đặt nhầm, hoặc thay đổi nhu cầu sử dụng sản phẩm.
                                                </p>
                                                <button className={refundCx('reason-badge', 'paid')}>Khách hỗ trợ phí trả hàng</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chi tiết đơn hoàn hàng (khách hàng gửi) */}
                                    <div className={refundCx('form-section')}>
                                        <label className={refundCx('section-label')}>Chi tiết đơn hoàn hàng (khách hàng gửi)</label>
                                        <div className={refundCx('request-box')}>
                                            {/* Product List with Images */}
                                            {order.items && order.items.length > 0 && (
                                                <div className={refundCx('product-list')}>
                                                    {order.items
                                                        .filter((item) => refundInfo.selectedProducts.includes(item.id))
                                                        .map((item, idx) => (
                                                            <div key={idx} className={refundCx('product-item')}>
                                                                <img
                                                                    src={
                                                                        item.imageUrl ||
                                                                        item.product?.defaultMedia?.mediaUrl ||
                                                                        item.product?.mediaUrls?.[0] ||
                                                                        defaultProductImage
                                                                    }
                                                                    alt={item.name || 'Sản phẩm'}
                                                                    className={refundCx('product-image')}
                                                                />
                                                                <div className={refundCx('product-info')}>
                                                                    <p className={refundCx('product-name')}>
                                                                        {item.name || item.product?.name || 'Sản phẩm'}
                                                                    </p>
                                                                    <p className={refundCx('product-meta')}>
                                                                        Số lượng: {item.quantity || 0} • Giá:{' '}
                                                                        {item.unitPrice != null
                                                                            ? formatCurrency(item.unitPrice, 'VND')
                                                                            : item.finalPrice != null
                                                                            ? formatCurrency(item.finalPrice, 'VND')
                                                                            : '—'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                            
                                            <div className={refundCx('request-row')}>
                                                <span>Lý do:</span>
                                                <span>{refundInfo.description || refundInfo.reason || 'Không có mô tả'}</span>
                                            </div>

                                            {/* Refund Summary */}
                                            <div className={refundCx('summary-block')}>
                                                <div className={refundCx('summary-title')}>Tóm tắt số tiền hoàn</div>
                                                <div className={refundCx('summary-row')}>
                                                    <span>Tổng đơn (đã thanh toán)</span>
                                                    <span>{formatCurrency(refund.totalPaid)}</span>
                                                </div>
                                                <div className={refundCx('summary-row')}>
                                                    <span>Giá trị sản phẩm</span>
                                                    <span>{formatCurrency(refund.productValue)}</span>
                                                </div>
                                                <div className={refundCx('summary-row')}>
                                                    <span>Phí vận chuyển (lần đầu)</span>
                                                    <span>{formatCurrency(refund.shippingFee)}</span>
                                                </div>
                                                <div className={refundCx('summary-row')}>
                                                    <span>Phí ship (lần 2 - khách tạm ứng)</span>
                                                    <span>{formatCurrency(refund.secondShippingFee)}</span>
                                                </div>
                                                <div className={refundCx('summary-row')}>
                                                    <span>Phí hoàn trả (10% khi lỗi khách hàng)</span>
                                                    <span>{formatCurrency(refund.returnPenalty)}</span>
                                                </div>
                                                <div className={refundCx('summary-row', 'total')}>
                                                    <span>Tổng hoàn (theo khách đề xuất)</span>
                                                    <span>{formatCurrency(refund.total)}</span>
                                                </div>
                                                {/* Chỉ hiển thị khi đã được nhân viên xác nhận */}
                                                {(() => {
                                                    const orderStatus = order?.status || order?.rawStatus || '';
                                                    const statusUpper = String(orderStatus).toUpperCase();
                                                    const isStaffConfirmed = statusUpper === 'RETURN_STAFF_CONFIRMED' || 
                                                                             statusUpper === 'REFUNDED';
                                                    const hasConfirmedAmount = order?.refundConfirmedAmount && 
                                                                              typeof order.refundConfirmedAmount === 'number' && 
                                                                              order.refundConfirmedAmount > 0;
                                                    
                                                    if (isStaffConfirmed && hasConfirmedAmount) {
                                                        return (
                                                            <div className={refundCx('summary-row', 'confirmed')}>
                                                                <span>Tổng hoàn (nhân viên xác nhận)</span>
                                                                <span>{formatCurrency(order.refundConfirmedAmount)}</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>

                                            {/* Refund Method Info */}
                                            {refundInfo.refundMethod && (
                                                <>
                                                    <div className={refundCx('request-row')}>
                                                        <span>Phương thức hoàn tiền:</span>
                                                        <span>{refundInfo.refundMethod}</span>
                                                    </div>
                                                    {refundInfo.bank && (
                                                        <div className={refundCx('request-row')}>
                                                            <span>Ngân hàng:</span>
                                                            <span>{refundInfo.bank}</span>
                                                        </div>
                                                    )}
                                                    {refundInfo.accountNumber && (
                                                        <div className={refundCx('request-row')}>
                                                            <span>Số tài khoản:</span>
                                                            <span>{refundInfo.accountNumber}</span>
                                                        </div>
                                                    )}
                                                    {refundInfo.accountHolder && (
                                                        <div className={refundCx('request-row')}>
                                                            <span>Chủ tài khoản:</span>
                                                            <span>{refundInfo.accountHolder}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Return Address */}
                                            {refundInfo.returnAddress && (
                                                <div className={refundCx('request-row')}>
                                                    <span>Địa chỉ gửi hàng:</span>
                                                    <span>{refundInfo.returnAddress}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Attached Media */}
                                    {normalizedMediaUrls.length > 0 && (
                                        <div className={refundCx('form-section')}>
                                            <label className={refundCx('section-label')}>Ảnh / Video đính kèm</label>
                                            <p className={refundCx('media-hint')}>
                                                Bạn đã đính kèm {normalizedMediaUrls.length} {normalizedMediaUrls.length === 1 ? 'tệp' : 'tệp'} làm bằng chứng
                                            </p>
                                            <div className={refundCx('media-previews')}>
                                                {normalizedMediaUrls.map((url, index) => {
                                                    const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i.test(url);
                                                    const mediaItem = {
                                                        url: url,
                                                        name: isVideo ? `Video ${index + 1}` : `Ảnh ${index + 1}`,
                                                        isVideo: isVideo
                                                    };
                                                    return (
                                                        <div 
                                                            key={index} 
                                                            className={refundCx('media-preview-item')}
                                                            onClick={() => {
                                                                setLightboxUrls(normalizedMediaUrls);
                                                                setLightboxIndex(index);
                                                                setLightboxOpen(true);
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            {isVideo ? (
                                                                <video
                                                                    src={url}
                                                                    controls
                                                                    className={refundCx('preview-media')}
                                                                    preload="metadata"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={url}
                                                                    alt={`Bằng chứng ${index + 1}`}
                                                                    className={refundCx('preview-media')}
                                                                    loading="lazy"
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact Email */}
                                    <div className={refundCx('form-section')}>
                                        <label className={refundCx('section-label')}>Email liên hệ</label>
                                        <div className={refundCx('input', 'readonly')}>
                                            {refundInfo.email || order.customerEmail || 'N/A'}
                                        </div>
                                    </div>

                                    {/* Return Address */}
                                    <div className={refundCx('form-section')}>
                                        <label className={refundCx('section-label')}>Địa chỉ gửi hàng</label>
                                        <div className={refundCx('input', 'readonly')}>
                                            {refundInfo.returnAddress || 'N/A'}
                                        </div>
                                    </div>

                                    {/* Refund Method */}
                                    <div className={refundCx('form-section')}>
                                        <label className={refundCx('section-label')}>Hình thức hoàn tiền</label>
                                        <div className={refundCx('select', 'readonly')}>
                                            {refundInfo.refundMethod || 'N/A'}
                                        </div>

                                        {refundInfo.bank && (
                                            <div className={refundCx('bank-details')}>
                                                <div className={refundCx('select', 'readonly')}>
                                                    {refundInfo.bank}
                                                </div>
                                                <div className={refundCx('input', 'readonly')}>
                                                    {refundInfo.accountNumber}
                                                </div>
                                                <div className={refundCx('input', 'readonly')}>
                                                    {refundInfo.accountHolder}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cancel Order Dialog */}
            <CancelOrderDialog
                open={showCancelDialog}
                loading={cancelling}
                onConfirm={handleCancelOrder}
                onCancel={() => !cancelling && setShowCancelDialog(false)}
            />

            {/* Lightbox Modal for Images */}
            {lightboxOpen && lightboxUrls.length > 0 && (
                <div className={refundCx('lightbox')} onClick={() => setLightboxOpen(false)}>
                    <button className={refundCx('lightbox-close')} onClick={() => setLightboxOpen(false)}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                    {lightboxUrls.length > 1 && (
                        <>
                            <button 
                                className={refundCx('lightbox-nav', 'lightbox-prev')} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex((prev) => (prev - 1 + lightboxUrls.length) % lightboxUrls.length);
                                }}
                            >
                                <FontAwesomeIcon icon={faAngleLeft} />
                            </button>
                            <button 
                                className={refundCx('lightbox-nav', 'lightbox-next')} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex((prev) => (prev + 1) % lightboxUrls.length);
                                }}
                            >
                                <FontAwesomeIcon icon={faAngleRight} />
                            </button>
                        </>
                    )}
                    <div className={refundCx('lightbox-content')} onClick={(e) => e.stopPropagation()}>
                        {(() => {
                            const currentUrl = lightboxUrls[lightboxIndex];
                            const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i.test(currentUrl);
                            return isVideo ? (
                                <video
                                    src={currentUrl}
                                    controls
                                    autoPlay
                                    className={refundCx('lightbox-media')}
                                >
                                    Trình duyệt của bạn không hỗ trợ video.
                                </video>
                            ) : (
                                <img
                                    src={currentUrl}
                                    alt={`Ảnh ${lightboxIndex + 1}`}
                                    className={refundCx('lightbox-media')}
                                />
                            );
                        })()}
                        {lightboxUrls.length > 1 && (
                            <div className={refundCx('lightbox-counter')}>
                                {lightboxIndex + 1} / {lightboxUrls.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

export default RefundOrderModal;

