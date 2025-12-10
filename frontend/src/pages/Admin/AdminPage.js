import React, { useEffect, useState, useRef } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import styles from './AdminPage.module.scss';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';
import { logout } from '~/services/auth';
import logo from '~/assets/icons/logo.png';
import classNames from 'classnames/bind';

// Sections
import ManageStaffAccounts from './ManageStaffAccounts/ManageStaffAccounts';
import ManageCategories from './ManageCategories/ManageCategories';
import ManageComplaints from './ManageComplaints/ManageComplaints';
import ManageContent from './ManageContent/ManageContent';
import ManageCustomerAccounts from './ManageCustomerAccounts/ManageCustomerAccounts';
import ManageOrders from './ManageOrders/ManageOrders';
import ManageProduct from './ManageProduct/ManageProduct';
import ManageVouchersPromotions from './ManageVouchersPromotions/ManageVouchersPromotions';
import ReportsAnalytics from './ReportsAnalytics/ReportsAnalytics';
import OrderDetailPage from './ManageOrders/OrderDetail';

const adminEmail = 'admin@novabeauty.com';
const cx = classNames.bind(styles);

function AdminPage() {
  const navigate = useNavigate?.();
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userMenuRef = useRef(null);

  // Guard: only admin can access
  useEffect(() => {
    const currentUser = storage.get(STORAGE_KEYS.USER);
    const email = (currentUser?.email || '').toLowerCase();
    if (email !== adminEmail) {
      if (navigate) navigate('/', { replace: true });
      else window.location.href = '/';
    }
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
    setOpenUserMenu(false);
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

  return (
    <div className={cx('wrapper')}>
      <header className={cx('topbar')}>
        <div className={cx('brand')}>
          <div className={cx('brandLogo')}>
            <img className={cx('logo')} src={logo} alt="logo"  />
          </div>
        </div>
        <div ref={userMenuRef} className={cx('adminInfo')}>
          <div className={cx('adminBtn')} onClick={() => setOpenUserMenu((v) => !v)}>
            <strong>ADMIN</strong>
            <div className={cx('avatar')}>A</div>
          </div>
          {openUserMenu && (
            <div className={cx('dropdown')}>
              <button
                className={cx('dropdownItem')}
                onClick={handleLogoutClick}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={cx('main')}>
        <aside className={cx('sidebar')}>
          <h3 className={cx('title')}>ADMIN PANEL</h3>
          <nav className={cx('menu')}>
            <NavLink to="/admin/staff" className={({ isActive }) => cx('menuBtn', { active: isActive })}>Quản lí Tài khoản nhân viên</NavLink>
            <NavLink to="/admin/customers" className={({ isActive }) => cx('menuBtn', { active: isActive })}>Quản lí Tài khoản khách hàng</NavLink>
            <NavLink to="/admin/products" className={({ isActive }) => cx('menuBtn', { active: isActive })}>Quản lí Sản phẩm</NavLink>
            <NavLink to="/admin/categories" className={({ isActive }) => cx('menuBtn', { active: isActive })}>Quản lí Danh mục</NavLink>
            <NavLink to="/admin/orders" className={({ isActive }) => cx('menuBtn', { active: isActive })}>Quản lí Đơn hàng</NavLink>
            <NavLink to="/admin/vouchers" className={({ isActive }) => cx('menuBtn', { active: isActive })}>Voucher & Khuyến mãi</NavLink>
            <NavLink to="/admin/complaints" className={({ isActive }) => cx('menuBtn', { active: isActive })}>Quản lí Khiếu nại</NavLink>
            <NavLink to="/admin/content" className={({ isActive }) => cx('menuBtn', { active: isActive })}>Quản lí Nội dung</NavLink>
            <NavLink to="/admin/reports" className={({ isActive }) => cx('menuBtn', { active: isActive })}>Báo cáo & Thống kê</NavLink>
          </nav>
          <button className={cx('logoutBtn')} onClick={handleLogoutClick}>Đăng xuất</button>
        </aside>

        <section className={cx('content')}>
          <Routes>
            <Route index element={<ManageStaffAccounts />} />
            <Route path="staff" element={<ManageStaffAccounts />} />
            <Route path="categories" element={<ManageCategories />} />
            <Route path="complaints" element={<ManageComplaints />} />
            <Route path="content" element={<ManageContent />} />
            <Route path="customers" element={<ManageCustomerAccounts />} />
            <Route path="orders" element={<ManageOrders />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="products" element={<ManageProduct />} />
            <Route path="vouchers" element={<ManageVouchersPromotions />} />
            <Route path="reports" element={<ReportsAnalytics />} />
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

export default AdminPage;


