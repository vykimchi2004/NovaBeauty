import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import styles from './StaffPage.module.scss';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';
import { logout } from '~/services/auth';
import logo from '~/assets/icons/logo.png';
import classNames from 'classnames/bind';

// Sections
import StaffProducts from './StaffProducts/StaffProducts';
import StaffVouchers from './StaffVouchers';
import StaffBanners from './StaffBanners';
// import StaffOrders from './StaffOrders/StaffOrders';
import StaffProfile from './StaffProfile/StaffProfile';

const cx = classNames.bind(styles);

function StaffPage() {
  const navigate = useNavigate?.();
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userMenuRef = useRef(null);

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
  }, [navigate]);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) setOpenUserMenu(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
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
          <button className={cx('notificationBtn')}>Thông báo</button>
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

// Placeholder components - sẽ thay thế sau
function StaffProductsPlaceholder() {
  return <div className={cx('placeholder')}></div>;
}

function StaffContentPlaceholder() {
  return <div className={cx('placeholder')}></div>;
}

function StaffOrdersPlaceholder() {
  return <div className={cx('placeholder')}></div>;
}

export default StaffPage;

