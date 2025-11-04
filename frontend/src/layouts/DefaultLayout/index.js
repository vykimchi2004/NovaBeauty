// src/layouts/DefaultLayout/DefaultLayout.js
import React, { useState } from 'react';
import styles from './DefaultLayout.module.scss';
import Navbar from '~/components/Layout/Navbar/Navbar';
import Header from '~/components/Layout/Header/Header';
import Footer from '~/components/Layout/Footer/Footer';
import LoginModal from '~/pages/Auth/LoginModal';
import RegisterModal from '~/pages/Auth/RegisterModal';
import ForgotPasswordModal from '~/pages/Auth/ForgotPasswordModal';

function DefaultLayout({ children }) {
  const [open, setOpen] = useState(false);

  // Quản lý modal đang mở: null | 'login' | 'register' | 'forgot'
  const [activeModal, setActiveModal] = useState(null);

  // Đóng tất cả modal
  const closeModal = () => setActiveModal(null);

  // Giả lập đăng nhập / đăng ký / quên mật khẩu
  const handleLogin = (credentials) => {
    console.log('Login attempt:', credentials);
    closeModal();
  };

  const handleRegister = (data) => {
    console.log('Register attempt:', data);
    closeModal();
  };

  const handleForgot = (email) => {
    console.log('Forgot password request for:', email);
    closeModal();
  };

  return (
    <div className={styles.wrapper}>
      {/* Header + Navbar */}
      <Header cartCount={0} open={open} setOpen={setOpen} onLoginClick={() => setActiveModal('login')} />
      <Navbar open={open} setOpen={setOpen} onLoginClick={() => setActiveModal('login')} />

      {/* Main content */}
      <main className={`${styles.content} main-content`}>{children}</main>
      <Footer />

      {/* ----- Modals ----- */}

      {/* Login Modal */}
      <LoginModal
        isOpen={activeModal === 'login'}
        onClose={closeModal}
        onLogin={handleLogin}
        onOpenRegister={() => setActiveModal('register')}
        onOpenForgot={() => setActiveModal('forgot')}
      />

      {/* Register Modal */}
      <RegisterModal
        isOpen={activeModal === 'register'}
        onClose={closeModal}
        onOpenLogin={() => setActiveModal('login')} // ✅ khớp với LoginModal logic
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={activeModal === 'forgot'}
        onClose={closeModal}
        onSubmit={handleForgot}
        onBackToLogin={() => setActiveModal('login')}
      />
    </div>
  );
}

export default DefaultLayout;
