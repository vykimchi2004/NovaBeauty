// src/layouts/DefaultLayout/DefaultLayout.js
import React, { useState } from 'react';
import styles from './DefaultLayout.module.scss';
import classNames from 'classnames/bind';
import Navbar from '~/components/Layout/Navbar/Navbar';
import Header from '~/components/Layout/Header/Header';
import Footer from '~/components/Layout/Footer/Footer';
import LoginModal from '~/pages/Auth/LoginModal';
import RegisterModal from '~/pages/Auth/RegisterModal';
import ForgotPasswordModal from '~/pages/Auth/ForgotPasswordModal';
import VerifyCodeModal from '~/pages/Auth/VerifyCodeModal';
import ResetPasswordModal from '~/pages/Auth/ResetPasswordModal';
import { verifyCode, resetPassword, sendVerificationCode, logout } from '~/services/auth';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';
import ChatButton from '~/components/Common/ChatButton';

const ADMIN_EMAILS = ['admin@novabeauty.com', 'admin@novabeuty.com'];

function DefaultLayout({ children }) {
  const cx = classNames.bind(styles);
  const navigate = useNavigate?.() || null;
  const location = useLocation?.() || { pathname: '/' };
  const [searchParams] = useSearchParams?.() || [new URLSearchParams()];
  const [open, setOpen] = useState(false);

  // Quản lý modal đang mở: null | 'login' | 'register' | 'forgot' | 'verify-code' | 'reset-password'
  const [activeModal, setActiveModal] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => storage.get(STORAGE_KEYS.USER));
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Khi reload lại trang, nếu admin đang đăng nhập thì điều hướng về /admin
  React.useEffect(() => {
    const email = currentUser?.email?.toLowerCase();
    if (!navigate || !email) return;

    if (ADMIN_EMAILS.includes(email) && !location.pathname.startsWith('/admin')) {
      navigate('/admin', { replace: true });
    }
  }, [currentUser, navigate, location.pathname]);

  React.useEffect(() => {
    const roleName = currentUser?.role?.name?.toUpperCase();
    if (!navigate || !roleName) return;

    if (roleName === 'STAFF' && !location.pathname.startsWith('/staff')) {
      navigate('/staff', { replace: true });
    } else if (roleName === 'CUSTOMER_SUPPORT' && !location.pathname.startsWith('/customer-support')) {
      navigate('/customer-support', { replace: true });
    }
  }, [currentUser, navigate, location.pathname]);
  
  // State cho forgot password flow
  const [forgotEmail, setForgotEmail] = useState('');
  const [verifiedOtp, setVerifiedOtp] = useState('');

  // Đóng tất cả modal
  const closeModal = () => {
    setActiveModal(null);
    setForgotEmail('');
    setVerifiedOtp('');
  };

  // Xử lý đăng nhập thành công
  const handleLoginSuccess = (userInfo) => {
    console.log('Login successful:', userInfo);
    if (userInfo) setCurrentUser(userInfo);
    // Modal sẽ tự đóng và reload page
  };

  // Xử lý khi OTP được gửi (forgot password)
  const handleForgotCodeSent = (email) => {
    setForgotEmail(email);
    setActiveModal('verify-code'); // Đóng forgot modal và mở verify modal
  };

  // Xử lý verify OTP cho forgot password
  const handleVerifyForgotCode = async (code) => {
    try {
      await verifyCode(forgotEmail, code);
      // Lưu OTP đã verify và chuyển sang modal đặt lại mật khẩu
      setVerifiedOtp(code);
      setActiveModal('reset-password');
    } catch (err) {
      throw err; // Let VerifyCodeModal handle the error
    }
  };

  // Xử lý reset password
  const handleResetPassword = async (newPassword) => {
    try {
      // Sử dụng OTP đã verify ở bước trước
      await resetPassword(forgotEmail, verifiedOtp, newPassword);
      // ResetPasswordModal sẽ hiển thị thông báo thành công
    } catch (err) {
      throw new Error(err.message || 'Đặt lại mật khẩu thất bại');
    }
  };

  // Xử lý sau khi reset password thành công
  const handleResetPasswordSuccess = () => {
    closeModal();
    setActiveModal('login');
  };

  // Resend OTP cho forgot password
  const handleResendForgotCode = async () => {
    try {
      await sendVerificationCode(forgotEmail, 'forgot');
    } catch (err) {
      throw err;
    }
  };

  // Lắng nghe sự kiện đăng ký để cập nhật tên hiển thị trên Header
  React.useEffect(() => {
    const onRegistered = (e) => {
      const detail = e?.detail;
      if (detail) setCurrentUser(detail);
    };
    window.addEventListener('userRegistered', onRegistered);
    // Đồng bộ khi thay đổi storage (nếu có)
    const onStorage = (e) => {
      if (e.key === STORAGE_KEYS.USER) {
        try {
          setCurrentUser(storage.get(STORAGE_KEYS.USER));
        } catch (_) {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('userRegistered', onRegistered);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Lắng nghe event mở login modal từ các component con
  React.useEffect(() => {
    const handleOpenLoginModal = () => {
      setActiveModal('login');
    };
    window.addEventListener('openLoginModal', handleOpenLoginModal);
    return () => {
      window.removeEventListener('openLoginModal', handleOpenLoginModal);
    };
  }, []);

  // Breadcrumb label mapping
  const BREADCRUMB_LABELS = {
    '/makeup': 'Trang điểm',
    '/skincare': 'Chăm sóc da',
    '/personal-care': 'Chăm sóc cá nhân',
    '/perfume': 'Nước hoa',
    '/accessories': 'Phụ kiện',
    '/haircare': 'Chăm sóc tóc',
    '/promo': 'Khuyến mãi',
    '/products': 'Tất cả sản phẩm',
    '/best-sellers': 'Top sản phẩm bán chạy',
    '/profile': 'Hồ sơ cá nhân',
    '/support': 'Hỗ trợ khách hàng',
  };

  const path = location.pathname || '/';
  let currentLabel = BREADCRUMB_LABELS[path] || null;
  const isProductDetail = path.startsWith('/product/');
  const productName = isProductDetail && location.state && location.state.name ? location.state.name : null;
  
  // Get category name from query params if on /products page
  const [categoryName, setCategoryName] = useState(null);
  const categoryId = path === '/products' ? searchParams.get('category') : null;
  
  React.useEffect(() => {
    if (categoryId && path === '/products') {
      const fetchCategoryName = async () => {
        try {
          const { getCategories } = await import('~/services/category');
          const categories = await getCategories();
          const category = categories.find(c => c.id === categoryId);
          if (category) {
            setCategoryName(category.name);
          }
        } catch (error) {
          console.error('Error fetching category:', error);
          setCategoryName(null);
        }
      };
      fetchCategoryName();
    } else {
      setCategoryName(null);
    }
  }, [categoryId, path]);
  
  // Override label if category is selected
  if (categoryId && categoryName) {
    currentLabel = categoryName;
  }

  // Load cart count từ API
  const [cartCount, setCartCount] = useState(0);

  React.useEffect(() => {
    const loadCartCount = async () => {
      try {
        const { default: cartService } = await import('~/services/cart');
        const count = await cartService.getCartCount();
        setCartCount(count);
      } catch (error) {
        // Nếu chưa đăng nhập hoặc lỗi, set về 0
        setCartCount(0);
      }
    };

    loadCartCount();

    // Lắng nghe event cartUpdated để cập nhật số lượng
    const handleCartUpdated = async () => {
      try {
        const { default: cartService } = await import('~/services/cart');
        const count = await cartService.getCartCount();
        setCartCount(count);
      } catch (error) {
        setCartCount(0);
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdated);
    return () => window.removeEventListener('cartUpdated', handleCartUpdated);
  }, []);

  return (
    <div className={cx('wrapper')}>
      {/* Header + Navbar - Sticky Container */}
      <div className={cx('stickyHeader')}>
        <Header
          cartCount={cartCount}
          open={open}
          setOpen={setOpen}
          onLoginClick={() => setActiveModal('login')}
          user={currentUser}
          onLogoutClick={() => {
            setShowLogoutConfirm(true);
          }}
          onProfileClick={() => {
            if (navigate) navigate('/profile');
          }}
        />
        <Navbar open={open} setOpen={setOpen} onLoginClick={() => setActiveModal('login')} />
      </div>

      {/* Breadcrumb across pages (hidden on home) */}
      {path !== '/' && (
        <nav className={cx('breadcrumb')} aria-label="breadcrumb">
          <Link to="/" className={cx('crumbLink')}>Trang chủ</Link>
          {(isProductDetail || currentLabel) && <span className={cx('sep')}>›</span>}
          {isProductDetail ? (
            <>
              <span className={cx('crumbText')}>{productName || 'Sản phẩm'}</span>
              <span className={cx('sep')}>›</span>
              <span className={cx('crumbCurrent')}>Chi tiết sản phẩm</span>
            </>
          ) : (
            currentLabel && <span className={cx('crumbCurrent')}>{currentLabel}</span>
          )}
        </nav>
      )}

      {/* Main content */}
      <main className={cx('content', 'main-content')}>{children}</main>
      <Footer />

      {/* Chat Button */}
      <ChatButton />

      {/* ----- Modals ----- */}

      {/* Login Modal */}
      <LoginModal
        isOpen={activeModal === 'login'}
        onClose={closeModal}
        onLoginSuccess={handleLoginSuccess}
        onOpenRegister={() => setActiveModal('register')}
        onOpenForgot={() => setActiveModal('forgot')}
      />

      {/* Register Modal */}
      <RegisterModal
        isOpen={activeModal === 'register'}
        onClose={closeModal}
        onOpenLogin={() => setActiveModal('login')}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={activeModal === 'forgot'}
        onClose={closeModal}
        onCodeSent={handleForgotCodeSent}
        onBackToLogin={() => setActiveModal('login')}
      />

      {/* Verify Code Modal (for forgot password) */}
      <VerifyCodeModal
        isOpen={activeModal === 'verify-code'}
        onClose={closeModal}
        email={forgotEmail}
        onSubmit={handleVerifyForgotCode}
        onResend={handleResendForgotCode}
        onBack={() => setActiveModal('forgot')}
        initialSeconds={60}
        title="Quên mật khẩu"
      />

      {/* Reset Password Modal (shown after OTP verification) */}
      <ResetPasswordModal
        isOpen={activeModal === 'reset-password'}
        onClose={closeModal}
        onSubmit={handleResetPassword}
        onBack={() => setActiveModal('verify-code')}
        onSuccess={handleResetPasswordSuccess}
      />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
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
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  try {
                    await logout();
                  } catch (_) {}
                  setCurrentUser(null);
                  try {
                    storage.remove(STORAGE_KEYS.USER);
                    storage.remove(STORAGE_KEYS.TOKEN);
                  } catch (_) {}
                  // Optional: reload để đảm bảo UI sạch
                  window.location.reload();
                }}
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

export default DefaultLayout;
