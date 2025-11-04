import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './AuthLayout.module.scss';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function LoginModal({ isOpen, onClose, onLogin, onOpenRegister, onOpenForgot }) {
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    if (onLogin) onLogin({ email, password });
    onClose();
  };

  const modal = (
    <div className={cx('overlay')} onClick={onClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeBtn')} onClick={onClose}>
          &times;
        </button>

        <h2 className={cx('title')}>Đăng nhập</h2>
        <p className={cx('subtitle')}>
          Bạn chưa có tài khoản?{' '}
          <span className={cx('register')} onClick={onOpenRegister}>
            Đăng ký
          </span>
        </p>

        <form onSubmit={handleSubmit} className={cx('form')}>
          <div className={cx('formGroup')}>
            <label>Email</label>
            <input name="email" type="email" placeholder="Nhập email của bạn" required />
          </div>

          <div className={cx('formGroup')}>
            <label>Mật khẩu</label>
            <div className={cx('passwordWrapper')}>
              <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Nhập mật khẩu" required />
              <button type="button" className={cx('eyeBtn')} onClick={() => setShowPassword((prev) => !prev)}>
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          <div className={cx('options')}>
            <label className={cx('remember')}>
              <input type="checkbox" /> Nhớ tài khoản
            </label>
            <p className={cx('forgot')}>
              <span onClick={onOpenForgot}>Quên mật khẩu?</span>
            </p>
          </div>

          <button type="submit" className={cx('loginBtn')}>
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.getElementById('modal-root'));
}

export default LoginModal;
