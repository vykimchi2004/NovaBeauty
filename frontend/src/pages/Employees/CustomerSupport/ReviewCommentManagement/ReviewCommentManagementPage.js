import { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './ReviewCommentManagementPage.module.scss';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '~/components/Common/Notification';
import { getAllReviews, replyToReview } from '~/services/review';
import { getUserById } from '~/services/user';

const cx = classNames.bind(styles);

const ratingToStars = (rating = 0) => {
    const safe = Math.max(0, Math.min(5, rating));
    return `${'★'.repeat(safe)}${'☆'.repeat(5 - safe)}`;
};

export default function ReviewCommentManagementPage() {
    const navigate = useNavigate();
    const { success: notifySuccess, error: notifyError } = useNotification();

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyDrafts, setReplyDrafts] = useState({});
    const [replyingIds, setReplyingIds] = useState(new Set());
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [loadingCustomerInfo, setLoadingCustomerInfo] = useState(false);

    // Map dữ liệu từ ReviewResponse sang format component đang dùng
    const mapReviewData = (reviewData) => {
        if (!reviewData || typeof reviewData !== 'object') {
            return null;
        }

        // Xử lý ngày tháng: hỗ trợ cả ISO string và LocalDateTime format
        const formatDate = (dateValue) => {
            if (!dateValue) return '';
            try {
                const date = new Date(dateValue);
                if (isNaN(date.getTime())) return '';
                return date.toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                });
            } catch {
                return '';
            }
        };

        // Xử lý tên khách hàng: ưu tiên nameDisplay, sau đó userName
        const getCustomerName = () => {
            const nameDisplay = reviewData.nameDisplay?.trim();
            if (nameDisplay) return nameDisplay;
            const userName = reviewData.userName?.trim();
            if (userName) return userName;
            return 'Người dùng ẩn danh';
        };

        // Đảm bảo rating là số hợp lệ từ 0-5
        const getRating = () => {
            const rating = reviewData.rating;
            if (rating === null || rating === undefined) return 0;
            const numRating = Number(rating);
            if (isNaN(numRating)) return 0;
            return Math.max(0, Math.min(5, Math.round(numRating)));
        };

        return {
            id: reviewData.id || '',
            customerName: getCustomerName(),
            date: formatDate(reviewData.createdAt),
            comment: reviewData.comment?.trim() || '',
            reply: reviewData.reply?.trim() || '',
            rating: getRating(),
            status: reviewData.reply?.trim() ? 'answered' : 'pending',
            productName: reviewData.productName?.trim() || '',
            productId: reviewData.productId || '',
            userId: reviewData.userId || null, // Lưu userId để có thể lấy thông tin khách hàng
        };
    };

    // Fetch dữ liệu reviews từ API
    useEffect(() => {
        const fetchReviews = async () => {
            try {
                setLoading(true);
                const reviewsData = await getAllReviews();
                
                // Đảm bảo reviewsData là mảng hợp lệ
                if (!Array.isArray(reviewsData)) {
                    console.warn('getAllReviews returned non-array data:', reviewsData);
                    setReviews([]);
                    setLoading(false);
                    return;
                }

                // Sắp xếp theo ngày mới nhất trước (sắp xếp trước khi map để dùng createdAt từ API)
                const sortedData = [...reviewsData].sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return dateB - dateA; // Mới nhất trước
                });

                // Lọc và map dữ liệu, loại bỏ các item null/invalid
                const mappedReviews = sortedData
                    .map(mapReviewData)
                    .filter((review) => review !== null && review.id);

                setReviews(mappedReviews);
                
                // Khởi tạo replyDrafts từ dữ liệu thật
                const drafts = {};
                mappedReviews.forEach((review) => {
                    drafts[review.id] = review.reply || '';
                });
                setReplyDrafts(drafts);
            } catch (error) {
                console.error('Error fetching reviews:', error);
                notifyError('Không thể tải danh sách đánh giá. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [notifyError]);

    const handleChangeReply = (id, value) => {
        setReplyDrafts((prev) => ({
            ...prev,
            [id]: value,
        }));
    };

    const handleCustomerNameClick = async (userId) => {
        if (!userId) {
            notifyError('Không có thông tin khách hàng.');
            return;
        }

        try {
            setLoadingCustomerInfo(true);
            const userInfo = await getUserById(userId);
            
            if (userInfo && typeof userInfo === 'object') {
                setSelectedCustomer(userInfo);
            } else {
                console.warn('User info is null or invalid:', userInfo);
                notifyError('Không thể tải thông tin khách hàng.');
            }
        } catch (error) {
            console.error('Error fetching customer info:', error);
            notifyError(`Có lỗi xảy ra khi tải thông tin khách hàng: ${error.message || 'Unknown error'}`);
        } finally {
            setLoadingCustomerInfo(false);
        }
    };

    const handleSendReply = async (id) => {
        const draft = replyDrafts[id] ? replyDrafts[id].trim() : '';
        if (!draft) {
            notifyError('Vui lòng nhập nội dung trả lời trước khi gửi.');
            return;
        }

        try {
            setReplyingIds((prev) => new Set(prev).add(id));

            const { ok, status, data } = await replyToReview(id, { reply: draft });

            if (status === 401) {
                notifyError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                return;
            }

            if (!ok) {
                notifyError('Không thể gửi phản hồi. Vui lòng thử lại.');
                return;
            }

            // Cập nhật UI với dữ liệu từ server
            const updatedReview = mapReviewData(data);
            if (updatedReview && updatedReview.id) {
                setReviews((prev) =>
                    prev.map((review) =>
                        review.id === id ? updatedReview : review,
                    ),
                );
                // Clear input sau khi gửi thành công
                setReplyDrafts((prev) => ({
                    ...prev,
                    [id]: '',
                }));
            }

            notifySuccess('Đã gửi phản hồi tới khách hàng.');
        } catch (error) {
            console.error('Error sending reply:', error);
            notifyError('Có lỗi xảy ra khi gửi phản hồi. Vui lòng thử lại.');
        } finally {
            setReplyingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('topLine')} />
            <div className={cx('pageHeader')}>
                <h1 className={cx('pageTitle')}>Đánh giá và bình luận</h1>
                <button className={cx('dashboardBtn')} onClick={() => navigate('/customer-support')}>
                    ← Dashboard
                </button>
            </div>

            <div className={cx('contentWrapper')}>
                <div className={cx('contentCard')}>
                    <div className={cx('cardHeading')}>
                        <h2 className={cx('sectionTitle')}>Quản lý đánh giá &amp; bình luận</h2>
                        <p className={cx('sectionDesc')}>
                            Danh sách đánh giá và bình luận của khách hàng. Trả lời trực tiếp từ giao diện này.
                        </p>
                    </div>

                    {loading ? (
                        <div className={cx('loadingState')}>Đang tải danh sách đánh giá...</div>
                    ) : reviews.length === 0 ? (
                        <div className={cx('emptyState')}>Chưa có đánh giá nào.</div>
                    ) : (
                        <div className={cx('reviewsList')}>
                            {reviews.map((review) => {
                                const isReplying = replyingIds.has(review.id);
                                return (
                                    <div key={review.id} className={cx('reviewItem')}>
                                        <div className={cx('reviewHeader')}>
                                            <div className={cx('customerInfo')}>
                                                <span 
                                                    className={cx('customerName', { clickable: review.userId })}
                                                    onClick={() => review.userId && handleCustomerNameClick(review.userId)}
                                                    style={{ cursor: review.userId ? 'pointer' : 'default' }}
                                                    title={review.userId ? 'Click để xem thông tin khách hàng' : ''}
                                                >
                                                    {review.customerName}
                                                </span>
                                                <span className={cx('reviewDate')}>{review.date}</span>
                                            </div>
                                            <div className={cx('rating')}>
                                                {ratingToStars(review.rating)}
                                            </div>
                                        </div>

                                        {review.productName && (
                                            <div className={cx('productInfo')}>
                                                Sản phẩm: <strong>{review.productName}</strong>
                                            </div>
                                        )}

                                        {review.comment && (
                                            <p className={cx('comment')}>{review.comment}</p>
                                        )}

                                        {review.reply && review.reply.trim() && (
                                            <div className={cx('replySection')}>
                                                <div className={cx('replyHeader')}>
                                                    <span className={cx('replyLabel')}>CSKH đã trả lời:</span>
                                                </div>
                                                <p className={cx('replyText')}>{review.reply}</p>
                                            </div>
                                        )}

                                        <div className={cx('replyInputRow')}>
                                            <input
                                                type="text"
                                                className={cx('replyInput')}
                                                placeholder="Nhập trả lời..."
                                                value={replyDrafts[review.id] || ''}
                                                onChange={(e) =>
                                                    handleChangeReply(review.id, e.target.value)
                                                }
                                                disabled={isReplying}
                                            />
                                            <button
                                                type="button"
                                                className={cx('replyButton')}
                                                onClick={() => handleSendReply(review.id)}
                                                disabled={isReplying}
                                            >
                                                {isReplying ? 'Đang gửi...' : 'Trả lời'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal hiển thị thông tin khách hàng */}
            {selectedCustomer && (
                <div className={cx('modalOverlay')} onClick={() => setSelectedCustomer(null)}>
                    <div className={cx('customerModal')} onClick={(e) => e.stopPropagation()}>
                        <div className={cx('modalHeader')}>
                            <h3 className={cx('modalTitle')}>Thông tin khách hàng</h3>
                            <button 
                                className={cx('closeButton')}
                                onClick={() => setSelectedCustomer(null)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={cx('modalContent')}>
                            {loadingCustomerInfo ? (
                                <div className={cx('loadingState')}>Đang tải thông tin...</div>
                            ) : selectedCustomer ? (
                                <div className={cx('customerDetails')}>
                                    <div className={cx('detailRow')}>
                                        <span className={cx('detailLabel')}>Họ và tên:</span>
                                        <span className={cx('detailValue')}>
                                            {selectedCustomer.fullName || '-'}
                                        </span>
                                    </div>
                                    <div className={cx('detailRow')}>
                                        <span className={cx('detailLabel')}>Email:</span>
                                        <span className={cx('detailValue')}>
                                            {selectedCustomer.email || '-'}
                                        </span>
                                    </div>
                                    <div className={cx('detailRow')}>
                                        <span className={cx('detailLabel')}>Số điện thoại:</span>
                                        <span className={cx('detailValue')}>
                                            {selectedCustomer.phoneNumber || '-'}
                                        </span>
                                    </div>
                                    <div className={cx('detailRow')}>
                                        <span className={cx('detailLabel')}>Địa chỉ:</span>
                                        <span className={cx('detailValue')}>
                                            {selectedCustomer.address || '-'}
                                        </span>
                                    </div>
                                    <div className={cx('detailRow')}>
                                        <span className={cx('detailLabel')}>Vai trò:</span>
                                        <span className={cx('detailValue')}>
                                            {selectedCustomer.role?.name || '-'}
                                        </span>
                                    </div>
                                    <div className={cx('detailRow')}>
                                        <span className={cx('detailLabel')}>Trạng thái:</span>
                                        <span className={cx('detailValue', { 
                                            active: selectedCustomer.active || selectedCustomer.isActive,
                                            inactive: !(selectedCustomer.active || selectedCustomer.isActive)
                                        })}>
                                            {(selectedCustomer.active || selectedCustomer.isActive) ? 'Hoạt động' : 'Không hoạt động'}
                                        </span>
                                    </div>
                                    {selectedCustomer.createAt && (
                                        <div className={cx('detailRow')}>
                                            <span className={cx('detailLabel')}>Ngày tạo:</span>
                                            <span className={cx('detailValue')}>
                                                {new Date(selectedCustomer.createAt).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={cx('loadingState')}>Không có dữ liệu</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

