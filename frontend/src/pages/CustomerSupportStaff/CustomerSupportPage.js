import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import { NavLink, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import styles from './CustomerSupportPage.module.scss';
import logo from '../../assets/icons/logo.png';
import { STORAGE_KEYS } from '../../services/config';
import { storage } from '../../services/utils';
import { logout } from '../../services/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import ComplaintManagementPage from './ComplaintManagement/ComplaintManagementPage';
import ReviewCommentManagementPage from './ReviewCommentManagement/ReviewCommentManagementPage';
import RefundManagementPage from './RefundManagement/RefundManagementPage';
import RefundDetailPage from './RefundManagement/RefundDetail/RefundDetailPage';
import ProfileCustomerSupportPage from './ProfileCustomerSupport/ProfileCustomerSupportPage';

const cx = classNames.bind(styles);

const MENU_ITEMS = [
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
    const [notifications] = useState([]);
    const initials = (user?.fullName || 'CS')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('');

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
            await logout().catch(() => {});
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
                                            {notifications.length === 0
                                                ? 'Không có thông báo'
                                                : `${notifications.length} thông báo`}
                                        </div>
                                    </div>
                                </div>
                                <div className={cx('notificationList')}>
                                    {notifications.length === 0 ? (
                                        <div className={cx('notificationEmpty')}>Chưa có thông báo mới</div>
                                    ) : (
                                        notifications.map((item) => (
                                            <div key={item.id} className={cx('notificationItem')}>
                                                <div className={cx('notificationTitle')}>{item.title || 'Thông báo'}</div>
                                                <div className={cx('notificationMessage')}>{item.message || ''}</div>
                                            </div>
                                        ))
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
                        <Route path="complaints" element={<ComplaintManagementPage />} />
                        <Route path="reviews" element={<ReviewCommentManagementPage />} />
                        <Route path="refund-management" element={<RefundManagementPage />} />
                        <Route path="refund-management/:id" element={<RefundDetailPage />} />
                        <Route path="profile" element={<ProfileCustomerSupportPage />} />
                        <Route path="*" element={<Navigate to="/customer-support" replace />} />
                    </Routes>
                </section>
            </div>
            {renderLogoutConfirm()}
        </div>
    );
}


