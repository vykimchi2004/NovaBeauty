// src/pages/Auth/ForgotPasswordModal.js
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './AuthLayout.module.scss';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { sendVerificationCode } from '~/services/auth';

const cx = classNames.bind(styles);

function ForgotPasswordModal({ isOpen, onClose, onBackToLogin, onCodeSent }) {
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [renderKey, setRenderKey] = useState(0);
  const emailRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setEmailError('');
      setLoading(false);
      setRenderKey((k) => k + 1);
      setTimeout(() => {
        if (emailRef.current) emailRef.current.value = '';
      }, 0);
    }
  }, [isOpen]);

  const handleClose = () => {
    setEmailError('');
    setLoading(false);
    if (emailRef.current) emailRef.current.value = '';
    onClose?.();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    
    setEmailError('');
    
    if (!email) {
      setEmailError('Vui lòng nhập email');
      return;
    }

    // Kiểm tra nếu là admin email thì không cho phép quên mật khẩu
    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail === 'admin@novabeauty.com' || normalizedEmail === 'admin@novabeuty.com') {
      setEmailError('Bạn không có quyền này');
      return;
    }

    setLoading(true);

    try {
      // Gọi API gửi OTP với mode='forgot'
      await sendVerificationCode(email, 'forgot');
      
      // Chuyển sang modal verify code (không đóng modal này, để parent xử lý)
      if (onCodeSent) {
        onCodeSent(email);
      }
      // Không gọi onClose() ở đây, để parent component quản lý việc đóng/mở modal
    } catch (err) {
      setEmailError(err.message || 'Không thể gửi mã xác nhận. Vui lòng thử lại.');
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
        <button className={cx('backBtn')} onClick={onBackToLogin}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>

        <p className={cx('subtitle')}>Chúng tôi sẽ gửi cho bạn mã code qua email để đặt lại mật khẩu.</p>
        <form key={renderKey} onSubmit={handleSubmit} className={cx('form')} noValidate>
          <div className={cx('formGroup')}>
            <label>Email</label>
            <input ref={emailRef} name="email" type="email" placeholder="example@email.com" disabled={loading} />
            {emailError && <div className={cx('error')}>{emailError}</div>}
          </div>
          <button type="submit" className={cx('loginBtn')} disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi'}
          </button>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.getElementById('modal-root'));
}

export default ForgotPasswordModal;
