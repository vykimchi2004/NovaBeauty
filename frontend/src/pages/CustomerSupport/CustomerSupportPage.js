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
import CustomerSupportMain from './CustomerSupportMain/CustomerSupportMainPage';
import ComplaintManagementPage from './ComplaintManagement/ComplaintManagementPage';
import ReviewCommentManagementPage from './ReviewCommentManagement/ReviewCommentManagementPage';
import RefundManagementPage from './RefundManagement/RefundManagementPage';
import RefundDetailPage from './RefundManagement/RefundDetail/RefundDetailPage';
import CustomerSupportNotificationPage from './CustomerSupportNotification/CustomerSupportNotificationPage';
import ProfileCustomerSupportPage from './ProfileCustomerSupport/ProfileCustomerSupportPage';

const cx = classNames.bind(styles);

const MENU_ITEMS = [
    { title: 'Tổng quan', path: '/customer-support', end: true },
    { title: 'Khiếu nại', path: '/customer-support/complaints' },
    { title: 'Đánh giá & bình luận', path: '/customer-support/reviews' },
    { title: 'Trả hàng / Hoàn tiền', path: '/customer-support/refund-management' },
    { title: 'Thông báo', path: '/customer-support/notifications' },
    { title: 'Hồ sơ cá nhân', path: '/customer-support/profile' },
];

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
            <div className={cx('logoutConfirm')}>
                <div className={cx('logoutCard')}>
                    <h3 className={cx('logoutTitle')}>Đăng xuất khỏi hệ thống?</h3>
                    <p>Phiên làm việc hiện tại sẽ kết thúc.</p>
                    <div className={cx('logoutActions')}>
                        <button className={cx('btn', 'btnSecondary')} onClick={() => setShowLogoutConfirm(false)}>
                            Hủy
                        </button>
                        <button className={cx('btn', 'btnPrimary')} onClick={handleLogout}>
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
                        <img src={logo} alt="LuminaBook" className={cx('logo')} />
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
                    <button className={cx('logoutBtn')} onClick={() => setShowLogoutConfirm(true)}>
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
                        <Route index element={<CustomerSupportMain />} />
                        <Route path="complaints" element={<ComplaintManagementPage />} />
                        <Route path="reviews" element={<ReviewCommentManagementPage />} />
                        <Route path="refund-management" element={<RefundManagementPage />} />
                        <Route path="refund-management/:id" element={<RefundDetailPage />} />
                        <Route path="notifications" element={<CustomerSupportNotificationPage />} />
                        <Route path="profile" element={<ProfileCustomerSupportPage />} />
                        <Route path="*" element={<Navigate to="/customer-support" replace />} />
                    </Routes>
                </section>
            </div>
            {renderLogoutConfirm()}
        </div>
    );
}


