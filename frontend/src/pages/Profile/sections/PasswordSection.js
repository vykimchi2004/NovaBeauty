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
  onPasswordFieldChange
}) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className={cx('card')}>
      <div className={cx('cardHeader')}>
        <h2>Đổi mật khẩu</h2>
        <button type="submit" form="password-form" className={cx('btn', 'btnPrimary')}>
          Đổi mật khẩu
        </button>
      </div>

      <form id="password-form" onSubmit={onSubmit}>
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
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                aria-label={showCurrentPassword ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
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
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
              >
                <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
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
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
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



