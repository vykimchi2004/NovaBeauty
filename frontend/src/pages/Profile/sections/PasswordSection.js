import React, { useState } from 'react';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import styles from '../Profile.module.scss';

const cx = classNames.bind(styles);

function PasswordSection({ passwordForm, passwordMessage, onChange, onSubmit }) {
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
                onChange={(event) => onChange('current', event.target.value)}
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowCurrentPassword((prev) => !prev)}
              >
                <FontAwesomeIcon icon={showCurrentPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </label>
          <label>
            Mật khẩu mới
            <div className={cx('passwordWrapper')}>
              <input
                className={cx('input')}
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.next}
                onChange={(event) => onChange('next', event.target.value)}
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowNewPassword((prev) => !prev)}
              >
                <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </label>
          <label>
            Xác nhận mật khẩu mới
            <div className={cx('passwordWrapper')}>
              <input
                className={cx('input')}
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordForm.confirm}
                onChange={(event) => onChange('confirm', event.target.value)}
              />
              <button
                type="button"
                className={cx('eyeBtn')}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </label>
        </div>

        {passwordMessage && <div className={cx('footerSpace')}>{passwordMessage}</div>}
      </form>
    </div>
  );
}

export default PasswordSection;



