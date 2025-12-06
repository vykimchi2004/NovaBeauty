import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import styles from './RefundRequestModal.module.scss';
import { getApiBaseUrl, getStoredToken } from '~/services/utils';
import { getMyInfo } from '~/services/user';
import { getMyAddresses } from '~/services/address';
import { formatFullAddress } from '~/components/Common/AddressModal/useGhnLocations';
import AddressListModal from '~/components/Common/AddressModal/AddressListModal';
import { useNotification } from '~/components/Common/Notification';
import { uploadProductMedia } from '~/services/media';

const cx = classNames.bind(styles);

const BANKS = [
    'Vietcombank',
    'BIDV',
    'Vietinbank',
    'Agribank',
    'ACB',
    'Techcombank',
    'MBBank',
    'VPBank',
    'TPBank',
    'Sacombank',
];

export default function RefundRequestModal({ open, orderId, onClose, onSuccess }) {
    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useNotification();
    
    const [step, setStep] = useState(1); // 1: Select reason, 2: Fill form
    const [selectedReasonType, setSelectedReasonType] = useState(null);
    const [order, setOrder] = useState(null);
    const [formData, setFormData] = useState({
        customerName: '',
        description: '',
        email: '',
        phone: '',
        returnAddress: '',
        refundMethod: 'Hoàn tiền bằng tài khoản ngân hàng',
        bank: '',
        accountNumber: '',
        accountHolder: '',
    });
    
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [showAddressList, setShowAddressList] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [selectedImagePreview, setSelectedImagePreview] = useState(null);

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            // Reset all state when modal closes
            setStep(1);
            setSelectedReasonType(null);
            setFormData({
                customerName: '',
                description: '',
                email: '',
                phone: '',
                returnAddress: '',
                refundMethod: 'Hoàn tiền bằng tài khoản ngân hàng',
                bank: '',
                accountNumber: '',
                accountHolder: '',
            });
            setError('');
            setFieldErrors({});
            setSelectedAddress(null);
            setAttachedFiles([]);
            setImagePreviews([]);
            setSelectedImagePreview(null);
            return;
        }
    }, [open]);

    useEffect(() => {
        if (!open || !orderId) return;
        
        const fetchData = async () => {
            const token = getStoredToken();
            if (!token) return;

            try {
                setLoading(true);
                const apiBaseUrl = getApiBaseUrl();
                
                // Fetch user info
                const userInfo = await getMyInfo();
                if (userInfo) {
                    setFormData(prev => ({
                        ...prev,
                        customerName: userInfo.fullName || prev.customerName || '',
                        email: userInfo.email || prev.email || '',
                        phone: userInfo.phoneNumber || prev.phone || '',
                    }));
                }

                // Fetch default address
                try {
                    const addresses = await getMyAddresses();
                    if (Array.isArray(addresses) && addresses.length > 0) {
                        const defaultAddress = addresses.find((addr) => addr?.defaultAddress === true);
                        if (defaultAddress) {
                            const formattedAddress = formatFullAddress(defaultAddress);
                            setFormData(prev => ({
                                ...prev,
                                returnAddress: formattedAddress,
                            }));
                            setSelectedAddress(defaultAddress);
                        }
                    }
                } catch (_addrErr) {
                    // Ignore address fetch errors
                }

                // Fetch order details
                const orderResp = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(orderId)}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (orderResp.ok) {
                    const orderData = await orderResp.json();
                    const rawOrder = orderData?.result || orderData;
                    
                    if (rawOrder) {
                        const items = Array.isArray(rawOrder.items)
                            ? rawOrder.items.map((item, index) => ({
                                  id: item.id || String(index),
                                  productId: item.productId || item.product?.id,
                                  name: item.name || item.product?.name || 'Sản phẩm',
                                  quantity: item.quantity || 1,
                                  unitPrice: item.unitPrice || item.unit_price || 0,
                                  image: item.imageUrl || item.product?.defaultMedia?.mediaUrl || 'https://via.placeholder.com/80x100',
                              }))
                            : [];

                        setOrder({
                            id: rawOrder.id || '',
                            code: rawOrder.code || rawOrder.orderCode || orderId,
                            items,
                            totalAmount: rawOrder.totalAmount || 0,
                            shippingFee: rawOrder.shippingFee || 0,
                        });
                    }
                }
            } catch (err) {
                console.error('Error fetching refund data:', err);
                setError('Không thể tải thông tin đơn hàng');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [open, orderId]);

    const handleReasonSelect = (reasonType) => {
        setSelectedReasonType(reasonType);
        setStep(2);
    };

    const handleContinue = () => {
        if (!selectedReasonType) {
            setError('Vui lòng chọn lý do trả hàng');
            return;
        }
        setStep(2);
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        const remainingSlots = 5 - attachedFiles.length;
        
        if (remainingSlots <= 0) {
            e.target.value = '';
            return;
        }

        const filesToAdd = newFiles.slice(0, remainingSlots);
        const updatedFiles = [...attachedFiles, ...filesToAdd];
        setAttachedFiles(updatedFiles);

        // Create previews for new images and videos
        filesToAdd.forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreviews(prev => [...prev, {
                        id: Date.now() + Math.random() + index,
                        url: reader.result,
                        file: file,
                        name: file.name
                    }]);
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('video/')) {
                const videoUrl = URL.createObjectURL(file);
                setImagePreviews(prev => [...prev, {
                    id: Date.now() + Math.random() + index,
                    url: videoUrl,
                    file: file,
                    name: file.name,
                    isVideo: true
                }]);
            }
        });

        e.target.value = '';
    };

    const handleRemoveImage = (imageId) => {
        setImagePreviews(prev => {
            const imageToRemove = prev.find(img => img.id === imageId);
            if (imageToRemove) {
                if (imageToRemove.url && imageToRemove.url.startsWith('blob:')) {
                    URL.revokeObjectURL(imageToRemove.url);
                }
                setAttachedFiles(prevFiles => 
                    prevFiles.filter(file => file !== imageToRemove.file)
                );
            }
            return prev.filter(img => img.id !== imageId);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate
        const errors = {};
        if (!formData.returnAddress || !formData.returnAddress.trim()) {
            errors.returnAddress = 'Vui lòng chọn địa chỉ gửi hàng';
        }
        if (!formData.bank) errors.bank = 'Vui lòng chọn ngân hàng';
        if (!formData.accountNumber) errors.accountNumber = 'Vui lòng nhập số tài khoản';
        if (!formData.accountHolder) errors.accountHolder = 'Vui lòng nhập tên chủ tài khoản';
        if (imagePreviews.length === 0) {
            errors.media = 'Vui lòng đính kèm ít nhất một ảnh hoặc video làm bằng chứng';
        }
        
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        try {
            setSubmitting(true);
            const token = getStoredToken();
            const apiBaseUrl = getApiBaseUrl();
            
            const reasonText = selectedReasonType === 'store' 
                ? 'Sản phẩm gặp sự cố từ cửa hàng'
                : 'Thay đổi nhu cầu / Mua nhầm';

            // Upload media files if any
            let mediaUrls = [];
            if (attachedFiles.length > 0) {
                try {
                    const uploadResult = await uploadProductMedia(attachedFiles);
                    // Handle different response formats
                    if (uploadResult && Array.isArray(uploadResult)) {
                        mediaUrls = uploadResult;
                    } else if (uploadResult && uploadResult.urls && Array.isArray(uploadResult.urls)) {
                        mediaUrls = uploadResult.urls;
                    } else if (uploadResult && uploadResult.data && Array.isArray(uploadResult.data)) {
                        mediaUrls = uploadResult.data;
                    } else if (uploadResult && uploadResult.result && Array.isArray(uploadResult.result)) {
                        mediaUrls = uploadResult.result;
                    }
                    
                    if (mediaUrls.length === 0) {
                        throw new Error('Upload ảnh/video thất bại');
                    }
                } catch (uploadError) {
                    console.error('Error uploading media:', uploadError);
                    throw new Error('Không thể upload ảnh/video. Vui lòng thử lại.');
                }
            }

            const payload = {
                refundReasonType: selectedReasonType,
                refundDescription: formData.description || reasonText,
                refundEmail: formData.email,
                refundReturnAddress: formData.returnAddress,
                refundMethod: 'Hoàn tiền bằng tài khoản ngân hàng',
                refundBank: formData.bank,
                refundAccountNumber: formData.accountNumber,
                refundAccountHolder: formData.accountHolder,
                refundMediaUrls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
                note: `Yêu cầu hoàn tiền/trả hàng - ${reasonText}\nĐịa chỉ gửi hàng: ${formData.returnAddress}\nPhương thức hoàn tiền: Hoàn tiền bằng tài khoản ngân hàng`,
            };

            const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(orderId)}/request-return`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể gửi yêu cầu hoàn tiền');
            }

            showSuccess('Gửi yêu cầu hoàn tiền/ trả hàng thành công!');
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error submitting refund request:', err);
            setError(err.message || 'Không thể gửi yêu cầu hoàn tiền. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className={cx('overlay')} onClick={onClose}>
            <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
                <div className={cx('header')}>
                    <h3>Yêu cầu trả hàng / hoàn tiền</h3>
                    <button type="button" className={cx('closeBtn')} onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <div className={cx('body')}>
                    {loading ? (
                        <div className={cx('loading')}>Đang tải...</div>
                    ) : step === 1 ? (
                        <div className={cx('step1')}>
                            <div className={cx('conditions-box')}>
                                <h3>Điều kiện áp dụng trả hàng</h3>
                                <ul>
                                    <li>Yêu cầu gửi trong vòng 7 ngày kể từ khi nhận sản phẩm.</li>
                                    <li>Sản phẩm còn nguyên trạng (không bị hỏng, còn nguyên seal).</li>
                                    <li>Cung cấp ảnh/video làm bằng chứng.</li>
                                </ul>
                            </div>

                            <div className={cx('reason-section')}>
                                <h2>Lý do trả hàng / hoàn tiền</h2>
                                <div className={cx('reason-cards')}>
                                    <div 
                                        className={cx('reason-card', { selected: selectedReasonType === 'store' })}
                                        onClick={() => handleReasonSelect('store')}
                                    >
                                        <h3>Sản phẩm gặp sự cố từ cửa hàng</h3>
                                        <p>Sản phẩm có lỗi kỹ thuật, bị hỏng do đóng gói, hoặc thông tin hiển thị không đúng.</p>
                                        <span className={cx('badge', 'free')}>Miễn phí trả hàng</span>
                                    </div>

                                    <div 
                                        className={cx('reason-card', { selected: selectedReasonType === 'customer' })}
                                        onClick={() => handleReasonSelect('customer')}
                                    >
                                        <h3>Thay đổi nhu cầu / Mua nhầm</h3>
                                        <p>Khách hàng đặt nhầm, hoặc thay đổi nhu cầu sử dụng sản phẩm.</p>
                                        <span className={cx('badge', 'paid')}>Khách hỗ trợ phí trả hàng</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form className={cx('form')} onSubmit={handleSubmit}>
                            <h2>Yêu cầu trả hàng / hoàn tiền</h2>

                            {order && order.items && (
                                <div className={cx('products-section')}>
                                    <label>Sản phẩm trong đơn</label>
                                    <div className={cx('products-list')}>
                                        {order.items.map((item) => (
                                            <div key={item.id} className={cx('product-item')}>
                                                <img src={item.image} alt={item.name} />
                                                <div>
                                                    <p>{item.name}</p>
                                                    <span>Số lượng: {item.quantity}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={cx('form-group')}>
                                <label>Mô tả chi tiết</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Mô tả chi tiết về lý do trả hàng..."
                                    rows={4}
                                />
                            </div>

                            <div className={cx('form-group')}>
                                <label>Địa chỉ gửi hàng *</label>
                                <div className={cx('address-input')}>
                                    <input
                                        type="text"
                                        value={formData.returnAddress}
                                        readOnly
                                        placeholder="Chọn địa chỉ gửi hàng"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAddressList(true)}
                                    >
                                        Chọn địa chỉ
                                    </button>
                                </div>
                                {fieldErrors.returnAddress && (
                                    <span className={cx('error')}>{fieldErrors.returnAddress}</span>
                                )}
                            </div>

                            <div className={cx('form-group')}>
                                <label>Ảnh/Video bằng chứng *</label>
                                <div className={cx('media-upload')}>
                                    <input
                                        type="file"
                                        id="media-upload"
                                        accept="image/*,video/*"
                                        multiple
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                    <label htmlFor="media-upload" className={cx('upload-button')}>
                                        <span>+ Chọn ảnh/video</span>
                                        <span className={cx('upload-hint')}>(Tối đa 5 tệp, {imagePreviews.length}/5)</span>
                                    </label>
                                    {fieldErrors.media && (
                                        <span className={cx('error')}>{fieldErrors.media}</span>
                                    )}
                                    {imagePreviews.length > 0 && (
                                        <div className={cx('image-previews')}>
                                            {imagePreviews.map((preview) => {
                                                const isVideo = preview.isVideo || /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i.test(preview.url || '');
                                                return (
                                                    <div key={preview.id} className={cx('image-preview-item')}>
                                                        {preview.url ? (
                                                            <>
                                                        {isVideo ? (
                                                            <video 
                                                                src={preview.url} 
                                                                className={cx('preview-image', 'preview-video')}
                                                                preload="metadata"
                                                                muted
                                                                onClick={() => setSelectedImagePreview(preview)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        ) : (
                                                            <img 
                                                                src={preview.url} 
                                                                alt={preview.name}
                                                                className={cx('preview-image')}
                                                                onClick={() => setSelectedImagePreview(preview)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        )}
                                                            </>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            className={cx('remove-image-btn')}
                                                            onClick={() => handleRemoveImage(preview.id)}
                                                            title="Xóa tệp"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={cx('form-group')}>
                                <label>Thông tin tài khoản ngân hàng *</label>
                            </div>

                            <div className={cx('form-group')}>
                                <label>Ngân hàng *</label>
                                <select
                                    value={formData.bank}
                                    onChange={(e) => setFormData(prev => ({ ...prev, bank: e.target.value }))}
                                >
                                    <option value="">Chọn ngân hàng</option>
                                    {BANKS.map(bank => (
                                        <option key={bank} value={bank}>{bank}</option>
                                    ))}
                                </select>
                                {fieldErrors.bank && (
                                    <span className={cx('error')}>{fieldErrors.bank}</span>
                                )}
                            </div>

                            <div className={cx('form-group')}>
                                <label>Số tài khoản *</label>
                                <input
                                    type="text"
                                    value={formData.accountNumber}
                                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                    placeholder="Nhập số tài khoản"
                                />
                                {fieldErrors.accountNumber && (
                                    <span className={cx('error')}>{fieldErrors.accountNumber}</span>
                                )}
                            </div>

                            <div className={cx('form-group')}>
                                <label>Tên chủ tài khoản *</label>
                                <input
                                    type="text"
                                    value={formData.accountHolder}
                                    onChange={(e) => setFormData(prev => ({ ...prev, accountHolder: e.target.value }))}
                                    placeholder="Nhập tên chủ tài khoản"
                                />
                                {fieldErrors.accountHolder && (
                                    <span className={cx('error')}>{fieldErrors.accountHolder}</span>
                                )}
                            </div>

                            {error && <div className={cx('error-message')}>{error}</div>}

                            <div className={cx('actions')}>
                                <button
                                    type="button"
                                    className={cx('btn', 'btn-secondary')}
                                    onClick={() => setStep(1)}
                                >
                                    Quay lại
                                </button>
                                <button
                                    type="submit"
                                    className={cx('btn', 'btn-primary')}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {showAddressList && (
                <AddressListModal
                    open={showAddressList}
                    onClose={() => setShowAddressList(false)}
                    onSelect={(address) => {
                        const formatted = formatFullAddress(address);
                        setFormData(prev => ({ ...prev, returnAddress: formatted }));
                        setSelectedAddress(address);
                        setShowAddressList(false);
                        if (fieldErrors.returnAddress) {
                            setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.returnAddress;
                                return newErrors;
                            });
                        }
                    }}
                />
            )}

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
                        {selectedImagePreview.isVideo || /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i.test(selectedImagePreview.url || '') ? (
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


