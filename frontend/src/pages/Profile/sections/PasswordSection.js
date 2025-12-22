import React, { useState } from 'react';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import styles from '../Profile.module.scss';

const cx = classNames.bind(styles);

function PasswordSection({ 
  passwordForm, 
  passwordMessage, 
  onChange, 
  onSubmit,
  oldPasswordError,
  newPasswordError,
  confirmPasswordError,
  onPasswordFieldChange,
  isDisabled = false
}) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  console.log('[PasswordSection] isDisabled:', isDisabled);

  return (
    <div className={cx('card')}>
      <div className={cx('cardHeader')}>
        <h2>Đổi mật khẩu</h2>
        <button 
          type="submit" 
          form="password-form" 
          className={cx('btn', 'btnPrimary')}
          disabled={isDisabled}
        >
          Đổi mật khẩu
        </button>
      </div>

      {isDisabled && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          marginBottom: '16px',
          color: '#856404',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          <strong>Bạn chưa có mật khẩu.</strong><br />
          Vui lòng đăng ký và thiết lập mật khẩu trước khi có thể đổi mật khẩu.
        </div>
      )}

      <form 
        id="password-form" 
        onSubmit={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return false;
          }
          return onSubmit(e);
        }}
      >
        <div className={cx('grid')}>
          <label>
            Mật khẩu hiện tại
            <div className={cx('passwordWrapper')}>
              <input
                className={cx('input')}
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.current}
                onChange={(event) => {
                  onChange('current', event.target.value);
                  if (onPasswordFieldChange && oldPasswordError) {
                    onPasswordFieldChange('current');
                  }
                }}
                disabled={isDisabled}
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                aria-label={showCurrentPassword ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                disabled={isDisabled}
              >
                <FontAwesomeIcon icon={showCurrentPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {oldPasswordError && (
              <div style={{ 
                color: '#dc3545', 
                fontSize: '12px', 
                marginTop: '4px',
                fontWeight: '400',
                lineHeight: '1.5'
              }}>
                {oldPasswordError}
              </div>
            )}
          </label>
          <label>
            Mật khẩu mới
            <div className={cx('passwordWrapper')}>
              <input
                className={cx('input')}
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.next}
                onChange={(event) => {
                  onChange('next', event.target.value);
                  if (onPasswordFieldChange && newPasswordError) {
                    onPasswordFieldChange('next');
                  }
                }}
                disabled={isDisabled}
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                disabled={isDisabled}
              >
                {showNewPassword ? (
                  <FontAwesomeIcon icon={faEyeSlash} />
                ) : (
                  <FontAwesomeIcon icon={faEye} />
                )}
              </button>
            </div>
            {newPasswordError && (
              <div style={{ 
                color: '#dc3545', 
                fontSize: '12px', 
                marginTop: '4px',
                fontWeight: '400',
                lineHeight: '1.5'
              }}>
                {newPasswordError}
              </div>
            )}
          </label>
          <label>
            Xác nhận mật khẩu mới
            <div className={cx('passwordWrapper')}>
              <input
                className={cx('input')}
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordForm.confirm}
                onChange={(event) => {
                  onChange('confirm', event.target.value);
                  if (onPasswordFieldChange && confirmPasswordError) {
                    onPasswordFieldChange('confirm');
                  }
                }}
                disabled={isDisabled}
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                disabled={isDisabled}
              >
                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {confirmPasswordError && (
              <div style={{ 
                color: '#dc3545', 
                fontSize: '12px', 
                marginTop: '4px',
                fontWeight: '400',
                lineHeight: '1.5'
              }}>
                {confirmPasswordError}
              </div>
            )}
          </label>
        </div>
        {passwordMessage && passwordMessage.text && (
          <div className={cx('footerSpace', passwordMessage.type === 'success' ? 'success' : 'error')}>
            {passwordMessage.text}
          </div>
        )}
      </form>
    </div>
  );
}

export default PasswordSection;



