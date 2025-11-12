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
  const [error, setError] = useState('');
  const [renderKey, setRenderKey] = useState(0);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setError('');
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
    setError('');
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

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    setError('');

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
        if (loggedInEmail === 'admin@novabeauty.com') {
          if (navigate) {
            navigate('/admin', { replace: true });
          } else {
            window.location.href = '/admin';
          }
        } else {
          // Refresh page để cập nhật UI cho user thường
          window.location.reload();
        }
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.');
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

        <form key={renderKey} onSubmit={handleSubmit} className={cx('form')}>
          {error && <div className={cx('error')} style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
          
          <div className={cx('formGroup')}>
            <label>Email</label>
            <input ref={emailRef} name="email" type="email" placeholder="Nhập email của bạn" required disabled={loading} />
          </div>

          <div className={cx('formGroup')}>
            <label>Mật khẩu</label>
            <div className={cx('passwordWrapper')}>
              <input ref={passwordRef} name="password" type={showPassword ? 'text' : 'password'} placeholder="Nhập mật khẩu" required disabled={loading} />
              <button type="button" className={cx('eyeBtn')} onClick={() => setShowPassword((prev) => !prev)} disabled={loading}>
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
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
