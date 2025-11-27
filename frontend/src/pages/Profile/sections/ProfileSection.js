import React from 'react';
import classNames from 'classnames/bind';
import styles from '../Profile.module.scss';

const cx = classNames.bind(styles);

function ProfileSection({
  isEditingProfile,
  isSavingProfile,
  profileForm,
  profileMessage,
  phoneError,
  onCancelEdit,
  onChange,
  onSubmit,
}) {
  return (
    <div className={cx('card')}>
      <div className={cx('cardHeader')}>
        <h2>Hồ sơ cá nhân</h2>
        <div className={cx('actions')}>
          {isEditingProfile ? (
            <>
              <button
                type="button"
                className={cx('btn', 'btnSecondary')}
                onClick={onCancelEdit}
                disabled={isSavingProfile}
              >
                Huỷ
              </button>
              <button
                type="submit"
                form="profile-form"
                className={cx('btn', 'btnPrimary')}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={cx('btn', 'btnPrimary')}
              onClick={() => onChange('__toggle_edit__', true)}
            >
              Sửa
            </button>
          )}
        </div>
      </div>

      <form id="profile-form" onSubmit={onSubmit}>
        <div className={cx('grid')}>
          <label>
            Họ và tên
            <input
              className={cx('input')}
              type="text"
              value={profileForm.fullName}
              onChange={(event) => onChange('fullName', event.target.value)}
              placeholder="Chưa cập nhật"
              disabled={!isEditingProfile}
            />
          </label>
          <label>
            Email đăng nhập
            <input
              className={cx('input', 'inputDisabled')}
              type="email"
              value={profileForm.email}
              disabled
            />
          </label>
          <label>
            Số điện thoại
            <input
              className={cx('input')}
              type="tel"
              value={profileForm.phone}
              onChange={(event) => {
                // Chỉ cho phép nhập số
                const value = event.target.value.replace(/[^0-9]/g, '');
                // Giới hạn 10 ký tự
                const limitedValue = value.slice(0, 10);
                onChange('phone', limitedValue);
              }}
              onKeyPress={(e) => {
                // Chỉ cho phép nhập số
                if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                  e.preventDefault();
                }
              }}
              placeholder="Chưa cập nhật (bắt đầu bằng 0, 10 số)"
              disabled={!isEditingProfile}
              maxLength={10}
            />
            {phoneError && (
              <div className={cx('fieldError')}>{phoneError}</div>
            )}
          </label>
          <label>
            Địa chỉ
            <input
              className={cx('input')}
              type="text"
              value={profileForm.address}
              onChange={(event) => onChange('address', event.target.value)}
              placeholder="Chưa cập nhật"
              disabled={!isEditingProfile}
            />
          </label>
        </div>

        {profileMessage && (
          <div className={cx('footerSpace', profileMessage.type)}>{profileMessage.text}</div>
        )}
      </form>
    </div>
  );
}

export default ProfileSection;



