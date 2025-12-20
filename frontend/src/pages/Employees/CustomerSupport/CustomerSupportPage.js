import { useEffect, useState, useCallback } from 'react';
import classNames from 'classnames/bind';
import { NavLink, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import styles from './CustomerSupportPage.module.scss';
import logo from '~/assets/icons/logo.png';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';
import { logout } from '~/services/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import ComplaintManagementPage from './ComplaintManagement/ComplaintManagementPage';
import ReviewCommentManagementPage from './ReviewCommentManagement/ReviewCommentManagementPage';
import RefundManagementPage from './RefundManagement/RefundManagementPage';
import RefundDetailPage from './RefundManagement/RefundDetail/RefundDetailPage';
import ViewRefundDetailPage from './RefundManagement/ViewRefundDetail/ViewRefundDetailPage';
import ProfileCustomerSupportPage from './ProfileCustomerSupport/ProfileCustomerSupportPage';
import ChatSupportPage from './ChatSupport/ChatSupportPage';
import ChatDetailPage from './ChatSupport/ChatDetailPage';
import ticketService from '~/services/ticket';
import { getAllReviews } from '~/services/review';
import { getApiBaseUrl, getStoredToken } from '~/services/utils';

const cx = classNames.bind(styles);

const MENU_ITEMS = [
    { title: 'Hỗ trợ Chat', path: '/customer-support/chat-support' },
    { title: 'Khiếu nại', path: '/customer-support/complaints' },
    { title: 'Đánh giá & bình luận', path: '/customer-support/reviews' },
    { title: 'Trả hàng / Hoàn tiền', path: '/customer-support/refund-management' },
    { title: 'Hồ sơ cá nhân', path: '/customer-support/profile' },
];

// Dashboard component - gộp từ CustomerSupportMainPage
function Dashboard() {
    const navigate = useNavigate();

    return (
        <div className={cx('dashboard')}>
            <h1 className={cx('dashboardTitle')}>Trung tâm hỗ trợ khách hàng</h1>

            <div className={cx('dashboardGrid')}>
                <div
                    className={cx('card')}
                    onClick={() => navigate('/customer-support/chat-support')}
                >
                    <h2 className={cx('cardTitle')}>Hỗ trợ Chat</h2>
                    <p className={cx('cardDescription')}>
                        Quản lý và trả lời tin nhắn từ khách hàng qua ChatButton trên website.
                    </p>
                </div>

                <div
                    className={cx('card')}
                    onClick={() => navigate('/customer-support/complaints')}
                >
                    <h2 className={cx('cardTitle')}>Quản lý khiếu nại</h2>
                    <p className={cx('cardDescription')}>
                        Xem và xử lý các đơn khiếu nại từ khách hàng, theo dõi trạng thái và kết quả xử lý.
                    </p>
                </div>

                <div
                    className={cx('card')}
                    onClick={() => navigate('/customer-support/reviews')}
                >
                    <h2 className={cx('cardTitle')}>Đánh giá &amp; bình luận</h2>
                    <p className={cx('cardDescription')}>
                        Quản lý đánh giá, bình luận về sản phẩm, phản hồi lại khách và xử lý nội dung vi phạm.
                    </p>
                </div>

                <div
                    className={cx('card')}
                    onClick={() => navigate('/customer-support/refund-management')}
                >
                    <h2 className={cx('cardTitle')}>Trả hàng / Hoàn tiền</h2>
                    <p className={cx('cardDescription')}>
                        Theo dõi và xử lý yêu cầu trả hàng, hoàn tiền theo quy trình CSKH hiện tại.
                    </p>
                </div>

                <div
                    className={cx('card')}
                    onClick={() => navigate('/customer-support/profile')}
                >
                    <h2 className={cx('cardTitle')}>Hồ sơ nhân viên CSKH</h2>
                    <p className={cx('cardDescription')}>
                        Cập nhật thông tin cá nhân và mật khẩu cho tài khoản chăm sóc khách hàng.
                    </p>
                </div>

                <div className={cx('card', 'quickActions')}>
                    <h2 className={cx('cardTitle')}>Tác vụ nhanh</h2>
                    <div className={cx('quickActionButtons')}>
                        <button
                            type="button"
                            className={cx('quickActionBtn')}
                            onClick={() => navigate('/customer-support/complaints')}
                        >
                            Xử lý khiếu nại mới
                        </button>
                        <button
                            type="button"
                            className={cx('quickActionBtn')}
                            onClick={() => navigate('/customer-support/refund-management')}
                        >
                            Yêu cầu hoàn tiền
                        </button>
                        <button
                            type="button"
                            className={cx('quickActionBtn')}
                            onClick={() => navigate('/customer-support/reviews')}
                        >
                            Theo dõi đánh giá
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CustomerSupportPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(() => storage.get(STORAGE_KEYS.USER));
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const initials = (user?.fullName || 'CS')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('');

    // Fetch notifications từ tickets, reviews và refund requests
    const fetchNotifications = useCallback(async () => {
        setLoadingNotifications(true);
        const notificationList = [];

        try {
            // 1. Fetch tickets (khiếu nại) - lọc những cái cần CSKH xử lý
            const tickets = await ticketService.getAllTickets();
            if (Array.isArray(tickets)) {
                const pendingTickets = tickets.filter(
                    (t) => t.status === 'NEW' || t.status === 'PENDING' || t.status === 'IN_PROGRESS'
                );
                pendingTickets.forEach((ticket) => {
                    const statusText = ticket.status === 'NEW' ? 'mới' :
                        ticket.status === 'PENDING' ? 'chờ xử lý' : 'đang xử lý';
                    notificationList.push({
                        id: `ticket-${ticket.id}`,
                        type: 'complaint',
                        title: 'Khiếu nại ' + statusText,
                        message: `Khách hàng ${ticket.customerName || 'N/A'} gửi khiếu nại${ticket.topic ? `: ${ticket.topic}` : ''}`,
                        createdAt: ticket.createdAt,
                        link: '/customer-support/complaints',
                    });
                });
            }
        } catch (error) {
            console.error('Error fetching tickets for notifications:', error);
        }

        try {
            // 2. Fetch reviews (đánh giá) - lọc những cái chưa trả lời
            const reviews = await getAllReviews();
            if (Array.isArray(reviews)) {
                const pendingReviews = reviews.filter((r) => !r.reply || !r.reply.trim());
                pendingReviews.forEach((review) => {
                    notificationList.push({
                        id: `review-${review.id}`,
                        type: 'review',
                        title: 'Đánh giá chưa trả lời',
                        message: `${review.nameDisplay || review.userName || 'Khách hàng'} đánh giá ${review.rating}★${review.productName ? ` - ${review.productName}` : ''}`,
                        createdAt: review.createdAt,
                        link: '/customer-support/reviews',
                    });
                });
            }
        } catch (error) {
            console.error('Error fetching reviews for notifications:', error);
        }

        try {
            // 3. Fetch refund requests (yêu cầu hoàn tiền) - lọc những cái cần CSKH xác nhận
            const token = getStoredToken();
            if (token) {
                const API_BASE_URL = getApiBaseUrl();
                const response = await fetch(`${API_BASE_URL}/orders/return-requests`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const refundOrders = data?.result || data || [];

                    // Chỉ lấy các yêu cầu đang chờ CSKH xử lý
                    const pendingRefunds = refundOrders.filter(
                        (order) => order.status === 'RETURN_REQUESTED' || order.status === 'RETURN_CS_CONFIRMED'
                    );

                    pendingRefunds.forEach((order) => {
                        const statusText = order.status === 'RETURN_REQUESTED' ? 'mới' : 'đã xác nhận';
                        notificationList.push({
                            id: `refund-${order.id}`,
                            type: 'refund',
                            title: `Yêu cầu hoàn tiền ${statusText}`,
                            message: `Khách hàng ${order.customerName || order.receiverName || 'N/A'} yêu cầu hoàn tiền đơn hàng #${order.code || order.id?.substring(0, 8)}`,
                            createdAt: order.orderDateTime || order.orderDate,
                            link: '/customer-support/refund-management',
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching refund requests for notifications:', error);
        }

        // Sắp xếp theo thời gian mới nhất
        notificationList.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
        });

        setNotifications(notificationList);
        setLoadingNotifications(false);
    }, []);

    // Fetch notifications khi component mount và khi path thay đổi
    useEffect(() => {
        fetchNotifications();
        // Refresh notifications mỗi 30 giây
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        const currentUser = storage.get(STORAGE_KEYS.USER);
        const roleName = currentUser?.role?.name?.toUpperCase();
        if (!currentUser || roleName !== 'CUSTOMER_SUPPORT') {
            navigate('/', { replace: true });
        } else {
            setUser(currentUser);
        }
    }, [navigate, location.pathname]);

    const handleLogout = async () => {
        setShowLogoutConfirm(false);
        try {
            await logout().catch(() => { });
        } finally {
            storage.remove(STORAGE_KEYS.USER);
            navigate('/', { replace: true });
            window.location.reload();
        }
    };

    const renderLogoutConfirm = () => {
        if (!showLogoutConfirm) return null;
        return (
            <div className={cx('logoutModalOverlay')} onClick={() => setShowLogoutConfirm(false)}>
                <div className={cx('logoutModal')} onClick={(e) => e.stopPropagation()}>
                    <h3 className={cx('logoutModalTitle')}>Xác nhận đăng xuất</h3>
                    <p className={cx('logoutModalMessage')}>Bạn có chắc chắn muốn đăng xuất không?</p>
                    <div className={cx('logoutModalActions')}>
                        <button
                            type="button"
                            className={cx('logoutModalBtn', 'logoutModalBtnCancel')}
                            onClick={() => setShowLogoutConfirm(false)}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            className={cx('logoutModalBtn', 'logoutModalBtnConfirm')}
                            onClick={handleLogout}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={cx('wrapper')}>
            <header className={cx('topbar')}>
                <div className={cx('brand')}>
                    <div className={cx('brandLogo')}>
                        <img src={logo} alt="NovaBeauty" className={cx('logo')} />
                    </div>
                </div>
                <div className={cx('topbarActions')}>
                    <div className={cx('notificationWrapper')}>
                        <button
                            type="button"
                            className={cx('notificationBtn', { hasUnread: notifications.length > 0 })}
                            onClick={() => setShowNotifications((prev) => !prev)}
                            aria-label="Thông báo"
                        >
                            <FontAwesomeIcon icon={faBell} />
                            {notifications.length > 0 && (
                                <span className={cx('notificationBadge')}>
                                    {notifications.length > 99 ? '99+' : notifications.length}
                                </span>
                            )}
                        </button>
                        {showNotifications && (
                            <div className={cx('notificationDropdown')}>
                                <div className={cx('notificationHeader')}>
                                    <div>
                                        <span>Thông báo</span>
                                        <div className={cx('notificationSub')}>
                                            {loadingNotifications
                                                ? 'Đang tải...'
                                                : notifications.length === 0
                                                    ? 'Không có thông báo'
                                                    : `${notifications.length} thông báo cần xử lý`}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className={cx('refreshBtn')}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fetchNotifications();
                                        }}
                                        disabled={loadingNotifications}
                                    >
                                        ↻
                                    </button>
                                </div>
                                <div className={cx('notificationList')}>
                                    {loadingNotifications ? (
                                        <div className={cx('notificationEmpty')}>Đang tải thông báo...</div>
                                    ) : notifications.length === 0 ? (
                                        <div className={cx('notificationEmpty')}>Không có việc cần xử lý</div>
                                    ) : (
                                        notifications.slice(0, 10).map((item) => (
                                            <div
                                                key={item.id}
                                                className={cx('notificationItem', item.type)}
                                                onClick={() => {
                                                    setShowNotifications(false);
                                                    navigate(item.link);
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className={cx('notificationIcon')}>
                                                    {item.type === 'complaint' ? '⚠️' : item.type === 'review' ? '💬' : '💰'}
                                                </div>
                                                <div className={cx('notificationContent')}>
                                                    <div className={cx('notificationTitle')}>{item.title}</div>
                                                    <div className={cx('notificationMessage')}>{item.message}</div>
                                                    {item.createdAt && (
                                                        <div className={cx('notificationTime')}>
                                                            {new Date(item.createdAt).toLocaleString('vi-VN', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {notifications.length > 10 && (
                                        <div className={cx('notificationMore')}>
                                            +{notifications.length - 10} thông báo khác
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <span className={cx('userName')}>{user?.fullName || 'CSKH'}</span>
                    <button className={cx('logoutBtnTop')} onClick={() => setShowLogoutConfirm(true)}>
                        Đăng xuất
                    </button>
                </div>
            </header>
            <div className={cx('main')}>
                <aside className={cx('sidebar')}>
                    <div className={cx('sidebarHeader')}>Chăm sóc khách hàng</div>
                    <div className={cx('profileCard')}>
                        <div className={cx('avatar')}>
                            <span className={cx('avatarLetter')}>{initials || 'CS'}</span>
                        </div>
                        <div className={cx('userInfo')}>
                            <div className={cx('userName')}>{user?.fullName || 'Nhân viên CSKH'}</div>
                            <div className={cx('userRole')}>Customer Support</div>
                        </div>
                    </div>
                    <nav className={cx('menu')}>
                        {MENU_ITEMS.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                className={({ isActive }) => cx('menuBtn', { active: isActive })}
                            >
                                {item.title}
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <section className={cx('content')}>
                    <Routes>
                        <Route index element={<Dashboard />} />
                        <Route path="chat-support" element={<ChatSupportPage />} />
                        <Route path="chat-support/:partnerId" element={<ChatDetailPage />} />
                        <Route path="complaints" element={<ComplaintManagementPage />} />
                        <Route path="reviews" element={<ReviewCommentManagementPage />} />
                        <Route path="refund-management" element={<RefundManagementPage />} />
                        <Route path="refund-management/:id" element={<RefundDetailPage />} />
                        <Route path="refund-management/view/:id" element={<ViewRefundDetailPage />} />
                        <Route path="profile" element={<ProfileCustomerSupportPage />} />
                        <Route path="*" element={<Navigate to="/customer-support" replace />} />
                    </Routes>
                </section>
            </div>
            {renderLogoutConfirm()}
        </div>
    );
}


