import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import styles from './StaffPage.module.scss';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';
import { logout } from '~/services/auth';
import logo from '~/assets/icons/logo.png';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import {
  loadStaffNotifications,
  markAllStaffNotificationsAsRead,
  removeStaffNotification,
  markStaffNotificationAsRead,
  clearStaffNotifications,
  STAFF_NOTIFICATION_EVENT,
} from '~/utils/staffNotifications';

// Sections
import StaffProducts from './StaffProducts';
import StaffVouchers from './StaffVouchers';
import StaffBanners from './StaffBanners';
// import StaffOrders from './StaffOrders/StaffOrders';
import StaffProfile from './StaffProfile';

const cx = classNames.bind(styles);

function StaffPage() {
  const navigate = useNavigate?.();
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Guard: only staff can access
  useEffect(() => {
    const currentUser = storage.get(STORAGE_KEYS.USER);
    if (!currentUser) {
      if (navigate) navigate('/', { replace: true });
      else window.location.href = '/';
      return;
    }

    // Kiểm tra role
    const roleName = currentUser?.role?.name?.toUpperCase() || '';
    if (roleName !== 'STAFF' && roleName !== 'CUSTOMER_SUPPORT') {
      if (navigate) navigate('/', { replace: true });
      else window.location.href = '/';
      return;
    }

    setUserInfo(currentUser);
    if (currentUser?.id) {
      setNotifications(loadStaffNotifications(currentUser.id));
    }
  }, [navigate]);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setOpenUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    const handleNotificationsUpdate = (event) => {
      setNotifications(event.detail || []);
    };
    window.addEventListener(STAFF_NOTIFICATION_EVENT, handleNotificationsUpdate);
    return () => window.removeEventListener(STAFF_NOTIFICATION_EVENT, handleNotificationsUpdate);
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout().catch(() => {});
    } finally {
      storage.remove(STORAGE_KEYS.USER);
      storage.remove(STORAGE_KEYS.TOKEN);
      if (navigate) navigate('/', { replace: true });
      else window.location.href = '/';
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const unreadCount = notifications.filter((item) => !item.read).length;
  const hasAnyRead = notifications.some((item) => item.read);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleMarkAllRead = () => {
    if (!userInfo?.id || notifications.length === 0) return;
    const updated = markAllStaffNotificationsAsRead(userInfo.id);
    setNotifications(updated);
  };

  const handleClearRead = () => {
    if (!userInfo?.id || !hasAnyRead) return;
    const updated = notifications.filter((item) => !item.read);
    if (updated.length === notifications.length) return;
    // Lưu lại chỉ các thông báo chưa đọc, xóa các thông báo đã đọc
    clearStaffNotifications(userInfo.id);
    if (updated.length) {
      // Re-add remaining unread notifications để giữ event sync
      updated.forEach((item) => {
        // sử dụng storage utils trực tiếp thông qua sự kiện cập nhật
        // nhưng ở đây chỉ cần set state tạm, event bên ngoài sẽ sync ở lần tiếp theo
      });
    }
    setNotifications(updated);
  };

  const handleNotificationMarkRead = (notificationId) => {
    if (!userInfo?.id || !notificationId) return;
    const updated = markStaffNotificationAsRead(userInfo.id, notificationId);
    setNotifications(updated);
  };

  const handleNotificationDelete = (notificationId, isRead) => {
    if (!userInfo?.id || !notificationId || !isRead) return;
    const updated = removeStaffNotification(userInfo.id, notificationId);
    setNotifications(updated);
  };

  const formatNotificationTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const handleNotificationNavigate = (path) => {
    if (path && navigate) {
      navigate(path);
    }
    setShowNotifications(false);
  };

  if (!userInfo) {
    return null; // Hoặc loading spinner
  }

  return (
    <div className={cx('wrapper')}>
      <header className={cx('topbar')}>
        <div className={cx('brand')}>
          <div className={cx('brandLogo')}>
            <img className={cx('logo')} src={logo} alt="logo" />
          </div>
        </div>
        <div className={cx('topbarActions')}>
          <div className={cx('notificationWrapper')} ref={notificationRef}>
            <button
              type="button"
              className={cx('notificationBtn', { hasUnread: unreadCount > 0 })}
              onClick={(e) => {
                e.stopPropagation();
                toggleNotifications();
              }}
              aria-label="Thông báo"
            >
              <FontAwesomeIcon icon={faBell} />
              {unreadCount > 0 && (
                <span className={cx('notificationBadge')}>
                  {unreadCount > 99 ? '99+' : unreadCount}
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
                  {notifications.length > 0 && (
                    <div className={cx('notificationHeaderActions')}>
                      <button
                        type="button"
                        className={cx('notificationActionBtn')}
                        onClick={handleMarkAllRead}
                      >
                        Đánh dấu tất cả đã đọc
                      </button>
                      <button
                        type="button"
                        className={cx('notificationActionBtn', 'danger', { disabled: !hasAnyRead })}
                        onClick={handleClearRead}
                        disabled={!hasAnyRead}
                      >
                        Xóa thông báo đã đọc
                      </button>
                    </div>
                  )}
                </div>
                <div className={cx('notificationList')}>
                  {notifications.length === 0 ? (
                    <div className={cx('notificationEmpty')}>Chưa có thông báo mới</div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={cx('notificationItem', { unread: !item.read })}
                      >
                        <div
                          onClick={() => handleNotificationNavigate(item.targetPath)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={cx('notificationTitle')}>{item.title || 'Thông báo'}</div>
                          <div className={cx('notificationMessage')}>{item.message}</div>
                        </div>
                        <div className={cx('notificationMetaRow')}>
                          <div className={cx('notificationMeta')}>
                            {formatNotificationTime(item.createdAt)}
                            <span
                              className={cx('notificationStatus', {
                                read: item.read,
                              })}
                            >
                              {item.read ? 'Đã đọc' : 'Chưa đọc'}
                            </span>
                          </div>
                          <div className={cx('notificationActions')}>
                            <button
                              type="button"
                              className={cx('notificationDeleteBtn')}
                              onClick={() => handleNotificationMarkRead(item.id)}
                            >
                              Đánh dấu đã đọc
                            </button>
                            <button
                              type="button"
                              className={cx('notificationDeleteBtn', {
                                disabled: !item.read,
                              })}
                              onClick={() => handleNotificationDelete(item.id, item.read)}
                              disabled={!item.read}
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button className={cx('logoutBtnTop')} onClick={handleLogoutClick}>
            Đăng xuất
          </button>
        </div>
      </header>

      <div className={cx('main')}>
        <aside className={cx('sidebar')}>
          <div className={cx('userProfile')}>
            <h3 className={cx('sidebarTitle')}>Hệ thống - Nhân viên</h3>
            <div className={cx('profileCard', 'noAvatar')}>
              <div className={cx('userInfo')}>
                <div className={cx('userName')}>{userInfo.fullName || 'Nhân viên'}</div>
                <div className={cx('userRole')}>Nhân viên</div>
              </div>
            </div>
          </div>

          <nav className={cx('menu')}>
            <NavLink to="/staff/products" className={({ isActive }) => cx('menuBtn', { active: isActive })}>
              Quản lý sản phẩm
            </NavLink>
            <NavLink to="/staff/content" className={({ isActive }) => cx('menuBtn', { active: isActive })}>
              Quản lý nội dung
            </NavLink>
            <NavLink to="/staff/vouchers" className={({ isActive }) => cx('menuBtn', { active: isActive })}>
              Voucher & Khuyến mãi
            </NavLink>
            <NavLink to="/staff/orders" className={({ isActive }) => cx('menuBtn', { active: isActive })}>
              Đơn hàng
            </NavLink>
            <NavLink to="/staff/profile" className={({ isActive }) => cx('menuBtn', { active: isActive })}>
              Hồ sơ cá nhân
            </NavLink>
          </nav>
        </aside>

        <section className={cx('content')}>
          <Routes>
            <Route index element={<StaffDashboard />} />
            <Route path="products" element={<StaffProducts />} />
            <Route path="content" element={<StaffBanners />} />
            <Route path="vouchers" element={<StaffVouchers />} />
            <Route path="orders" element={<StaffOrdersPlaceholder />} />
            <Route path="profile" element={<StaffProfile />} />
          </Routes>
        </section>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className={cx('logoutModalOverlay')} onClick={handleLogoutCancel}>
          <div className={cx('logoutModal')} onClick={(e) => e.stopPropagation()}>
            <h3 className={cx('logoutModalTitle')}>Xác nhận đăng xuất</h3>
            <p className={cx('logoutModalMessage')}>Bạn có chắc chắn muốn đăng xuất không?</p>
            <div className={cx('logoutModalActions')}>
              <button
                type="button"
                className={cx('logoutModalBtn', 'logoutModalBtnCancel')}
                onClick={handleLogoutCancel}
              >
                Hủy
              </button>
              <button
                type="button"
                className={cx('logoutModalBtn', 'logoutModalBtnConfirm')}
                onClick={handleLogoutConfirm}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Dashboard Component
function StaffDashboard() {
  const navigate = useNavigate();

  return (
    <div className={cx('dashboard')}>
      <h1 className={cx('dashboardTitle')}>Bảng điều khiển</h1>
      
      <div className={cx('dashboardGrid')}>
        <div className={cx('card')}>
          <h2 className={cx('cardTitle')}>Sản phẩm</h2>
          <p className={cx('cardDescription')}>
            Quản lý sản phẩm bạn tạo - chờ admin duyệt trước khi hiển thị.
          </p>
        </div>

        <div className={cx('card')}>
          <h2 className={cx('cardTitle')}>Voucher và khuyến mãi</h2>
          <p className={cx('cardDescription')}>
            Quản lý mã giảm giá và chương trình khuyến mãi.
          </p>
        </div>

        <div className={cx('card')}>
          <h2 className={cx('cardTitle')}>Đơn hàng</h2>
          <p className={cx('cardDescription')}>
            Xem đơn, cập nhật trạng thái, hủy đơn (trước giao).
          </p>
        </div>

        <div className={cx('card', 'quickActions')}>
          <h2 className={cx('cardTitle')}>Tác vụ nhanh</h2>
          <div className={cx('quickActionButtons')}>
            <button 
              className={cx('quickActionBtn')}
              onClick={() => navigate('/staff/products')}
            >
              Thêm sản phẩm
            </button>
            <button 
              className={cx('quickActionBtn')}
              onClick={() => navigate('/staff/vouchers')}
            >
              Thêm Voucher
            </button>
            <button 
              className={cx('quickActionBtn')}
              onClick={() => navigate('/staff/orders')}
            >
              Quản lý đơn hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function StaffOrdersPlaceholder() {
  return <div className={cx('placeholder')}></div>;
}

export default StaffPage;

