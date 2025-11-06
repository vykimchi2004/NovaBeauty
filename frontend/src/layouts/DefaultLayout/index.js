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
import { verifyCode, resetPassword, sendVerificationCode, logout } from '~/services/auth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';

function DefaultLayout({ children }) {
  const cx = classNames.bind(styles);
  const navigate = useNavigate?.() || null;
  const location = useLocation?.() || { pathname: '/' };
  const [open, setOpen] = useState(false);

  // Quản lý modal đang mở: null | 'login' | 'register' | 'forgot' | 'verify-code'
  const [activeModal, setActiveModal] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => storage.get(STORAGE_KEYS.USER));
  
  // State cho forgot password flow
  const [forgotEmail, setForgotEmail] = useState('');
  const [verifiedOtp, setVerifiedOtp] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Đóng tất cả modal
  const closeModal = () => {
    setActiveModal(null);
    setForgotEmail('');
    setVerifiedOtp('');
    setShowResetPassword(false);
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
    setActiveModal('verify-code');
  };

  // Xử lý verify OTP cho forgot password
  const handleVerifyForgotCode = async (code) => {
    try {
      await verifyCode(forgotEmail, code);
      // Lưu OTP đã verify và chuyển sang form đặt lại mật khẩu
      setVerifiedOtp(code);
      setShowResetPassword(true);
      setActiveModal(null);
    } catch (err) {
      throw err; // Let VerifyCodeModal handle the error
    }
  };

  // Xử lý reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
      alert('Mật khẩu không khớp');
      return;
    }

    if (password.length < 8) {
      alert('Mật khẩu phải ít nhất 8 ký tự');
      return;
    }

    try {
      // Sử dụng OTP đã verify ở bước trước
      await resetPassword(forgotEmail, verifiedOtp, password);
      alert('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
      closeModal();
      setActiveModal('login');
    } catch (err) {
      alert(err.message || 'Đặt lại mật khẩu thất bại');
    }
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
  };

  const path = location.pathname || '/';
  let currentLabel = BREADCRUMB_LABELS[path] || null;
  const isProductDetail = path.startsWith('/product/');
  const productName = isProductDetail && location.state && location.state.name ? location.state.name : null;

  return (
    <div className={cx('wrapper')}>
      {/* Header + Navbar */}
      <Header
        cartCount={0}
        open={open}
        setOpen={setOpen}
        onLoginClick={() => setActiveModal('login')}
        user={currentUser}
        onLogoutClick={async () => {
          try {
            await logout();
          } catch (_) {}
          setCurrentUser(null);
          try {
            storage.remove(STORAGE_KEYS.USER);
          } catch (_) {}
          // Optional: reload để đảm bảo UI sạch
          window.location.reload();
        }}
        onProfileClick={() => {
          if (navigate) navigate('/profile');
        }}
      />
      <Navbar open={open} setOpen={setOpen} onLoginClick={() => setActiveModal('login')} />

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
      />

      {/* Reset Password Form (shown after OTP verification) */}
      {showResetPassword && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2>Đặt lại mật khẩu</h2>
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '15px' }}>
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Nhập mật khẩu mới"
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Xác nhận mật khẩu</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Nhập lại mật khẩu"
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
                >
                  Đặt lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DefaultLayout;
