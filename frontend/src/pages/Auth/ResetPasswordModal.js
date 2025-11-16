import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './AuthLayout.module.scss';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faArrowLeft, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { validatePassword } from '~/services/utils';

const cx = classNames.bind(styles);

function ResetPasswordModal({ isOpen, onClose, onSubmit, onBack, onSuccess, loading: externalLoading }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setConfirmPasswordError('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setLoading(false);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setConfirmPasswordError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setLoading(false);
    setSuccess(false);
    onClose?.();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    setPasswordError('');
    setConfirmPasswordError('');

    let hasError = false;

    // Validation
    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu mới');
      hasError = true;
    } else if (!confirmPassword) {
      setConfirmPasswordError('Vui lòng xác nhận mật khẩu');
      hasError = true;
    } else {
      // Validate password theo quy định backend
      const passwordValidation = validatePassword(password, confirmPassword);
      if (!passwordValidation.isValid) {
        // Nếu lỗi là về khớp mật khẩu, hiển thị ở confirm field
        if (passwordValidation.error.includes('không khớp')) {
          setConfirmPasswordError(passwordValidation.error);
        } else {
          setPasswordError(passwordValidation.error);
        }
        hasError = true;
      }
    }

    if (hasError) return;

    setLoading(true);
    try {
      await onSubmit?.(password);
      // Nếu thành công, hiển thị màn hình success
      setSuccess(true);
    } catch (err) {
      setPasswordError(err.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || externalLoading;

  const modal = (
    <div className={cx('overlay')} onClick={success ? undefined : handleClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        {!success && (
          <>
            <button className={cx('closeBtn')} onClick={handleClose}>
              &times;
            </button>
            {onBack && (
              <button className={cx('backBtn')} onClick={onBack}>
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
            )}
          </>
        )}

        {success ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <FontAwesomeIcon 
                icon={faCheckCircle} 
                style={{ fontSize: '64px', color: '#4caf50', marginBottom: '16px' }} 
              />
            </div>
            <h2 className={cx('title')}>Đặt lại mật khẩu thành công!</h2>
            <p className={cx('subtitle')} style={{ marginBottom: '30px' }}>
              Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập với mật khẩu mới.
            </p>
            <button 
              type="button" 
              className={cx('loginBtn')} 
              onClick={() => {
                handleClose();
                if (onSuccess) onSuccess();
              }}
            >
              Đăng nhập
            </button>
          </>
        ) : (
          <>
            <h2 className={cx('title')}>Đặt lại mật khẩu</h2>
            <p className={cx('subtitle')}>Vui lòng nhập mật khẩu mới của bạn</p>

            <form onSubmit={handleSubmit} className={cx('form')} noValidate>
          <div className={cx('formGroup')}>
            <label>Mật khẩu mới</label>
            <div className={cx('passwordWrapper')}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                disabled={isLoading}
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}
                tabIndex={-1}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {passwordError && <div className={cx('error')}>{passwordError}</div>}
          </div>

          <div className={cx('formGroup')}>
            <label>Xác nhận mật khẩu</label>
            <div className={cx('passwordWrapper')}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                disabled={isLoading}
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                disabled={isLoading}
                tabIndex={-1}
              >
                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {confirmPasswordError && <div className={cx('error')}>{confirmPasswordError}</div>}
          </div>

          <button type="submit" className={cx('loginBtn')} disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.getElementById('modal-root'));
}

export default ResetPasswordModal;

