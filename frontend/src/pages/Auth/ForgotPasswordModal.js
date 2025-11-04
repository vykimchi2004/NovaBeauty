// src/pages/Auth/ForgotPasswordModal.js
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './AuthLayout.module.scss';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function ForgotPasswordModal({ isOpen, onClose, onBackToLogin, onSubmit }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    if (onSubmit) onSubmit(email);
    onClose();
  };

  const modal = (
    <div className={cx('overlay')} onClick={onClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeBtn')} onClick={onClose}>
          &times;
        </button>
        <button className={cx('backBtn')} onClick={onBackToLogin}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>

        <p className={cx('subtitle')}>Chúng tôi sẽ gửi cho bạn mã code qua email để đặt lại mật khẩu.</p>
        <form onSubmit={handleSubmit} className={cx('form')}>
          <div className={cx('formGroup')}>
            <label>Email</label>
            <input name="email" type="email" placeholder="example@email.com" required />
          </div>
          <button type="submit" className={cx('loginBtn')}>
            Gửi
          </button>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.getElementById('modal-root'));
}

export default ForgotPasswordModal;
