import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import styles from './AuthLayout.module.scss';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { login } from '~/services/auth';
import { getMyInfo } from '~/services/user';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';

const cx = classNames.bind(styles);

function LoginModal({ isOpen, onClose, onLoginSuccess, onOpenRegister, onOpenForgot }) {
  const navigate = useNavigate?.();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [renderKey, setRenderKey] = useState(0);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setEmailError('');
      setPasswordError('');
      setLoading(false);
      setShowPassword(false);
      setRenderKey((k) => k + 1); // Force remount inputs to clear values
      // Also clear values via refs in case of browser autofill persistence
      setTimeout(() => {
        if (emailRef.current) emailRef.current.value = '';
        if (passwordRef.current) passwordRef.current.value = '';
      }, 0);
    }
  }, [isOpen]);

  const handleClose = () => {
    setEmailError('');
    setPasswordError('');
    setLoading(false);
    setShowPassword(false);
    if (emailRef.current) emailRef.current.value = '';
    if (passwordRef.current) passwordRef.current.value = '';
    onClose?.();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;

    // Reset errors
    setEmailError('');
    setPasswordError('');

    let hasError = false;

    // Validation
    if (!email) {
      setEmailError('Vui lòng nhập email');
      hasError = true;
    } else {
      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError('Email không đúng định dạng');
        hasError = true;
      }
    }

    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      // Gọi API login
      const response = await login(email, password);
      
      if (response && response.token) {
        // Lấy thông tin user
        let userInfo = null;
        try {
          userInfo = await getMyInfo();
          if (userInfo) {
            storage.set(STORAGE_KEYS.USER, userInfo);
          }
        } catch (err) {
          console.warn('Could not fetch user info:', err);
        }

        // Thông báo thành công
        if (onLoginSuccess) {
          onLoginSuccess(userInfo);
        }

        // Đóng modal
        onClose();

        // Điều hướng theo tài khoản
        const loggedInEmail = (userInfo?.email || email || '').toLowerCase();
        const roleName = userInfo?.role?.name?.toUpperCase() || '';
        
        if (loggedInEmail === 'admin@novabeauty.com' || roleName === 'ADMIN') {
          if (navigate) {
            navigate('/admin', { replace: true });
          } else {
            window.location.href = '/admin';
          }
        } else if (roleName === 'STAFF') {
          if (navigate) {
            navigate('/staff', { replace: true });
          } else {
            window.location.href = '/staff';
          }
        } else if (roleName === 'CUSTOMER_SUPPORT') {
          if (navigate) {
            navigate('/customer-support', { replace: true });
          } else {
            window.location.href = '/customer-support';
          }
        } else {
          // Refresh page để cập nhật UI cho user thường
          window.location.reload();
        }
      } else {
        setPasswordError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      // Kiểm tra xem lỗi có liên quan đến mật khẩu không
      const errorMessage = err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.';
      const lowerMessage = errorMessage.toLowerCase();
      
      // Nếu lỗi liên quan đến mật khẩu, hiển thị dưới password field
      if (lowerMessage.includes('mật khẩu') || 
          lowerMessage.includes('password') || 
          lowerMessage.includes('unauthorized') || 
          lowerMessage.includes('unauthenticated') ||
          lowerMessage.includes('invalid credentials') ||
          lowerMessage.includes('sai mật khẩu') ||
          lowerMessage.includes('wrong password')) {
        setPasswordError('Mật khẩu không đúng');
      } else if (lowerMessage.includes('email') || lowerMessage.includes('user not found')) {
        setEmailError(errorMessage);
      } else {
        // Mặc định hiển thị dưới password vì thường lỗi đăng nhập là do mật khẩu sai
        setPasswordError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className={cx('overlay')} onClick={handleClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeBtn')} onClick={handleClose}>
          &times;
        </button>

        <h2 className={cx('title')}>Đăng nhập</h2>
        <p className={cx('subtitle')}>
          Bạn chưa có tài khoản?{' '}
          <span className={cx('register')} onClick={onOpenRegister}>
            Đăng ký
          </span>
        </p>

        <form key={renderKey} onSubmit={handleSubmit} className={cx('form')} noValidate>
          <div className={cx('formGroup')}>
            <label>Email</label>
            <input ref={emailRef} name="email" type="email" placeholder="Nhập email của bạn" disabled={loading} />
            {emailError && <div className={cx('error')}>{emailError}</div>}
          </div>

          <div className={cx('formGroup')}>
            <label>Mật khẩu</label>
            <div className={cx('passwordWrapper')}>
              <input ref={passwordRef} name="password" type={showPassword ? 'text' : 'password'} placeholder="Nhập mật khẩu" disabled={loading} />
              <button type="button" className={cx('eyeBtn')} onClick={() => setShowPassword((prev) => !prev)} disabled={loading} tabIndex={-1}>
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {passwordError && <div className={cx('error')}>{passwordError}</div>}
          </div>

          <div className={cx('options')}>
            <label className={cx('remember')}>
              <input type="checkbox" disabled={loading} /> Nhớ tài khoản
            </label>
            <p className={cx('forgot')}>
              <span onClick={loading ? undefined : onOpenForgot} style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
                Quên mật khẩu?
              </span>
            </p>
          </div>

          <button type="submit" className={cx('loginBtn')} disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.getElementById('modal-root'));
}

export default LoginModal;
