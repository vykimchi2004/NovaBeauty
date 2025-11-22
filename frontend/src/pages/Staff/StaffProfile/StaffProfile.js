import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import styles from './StaffProfile.module.scss';
import { storage } from '~/services/utils';
import { getMyInfo, updateUser } from '~/services/user';
import { changePassword } from '~/services/auth';
import notifier from '~/utils/notification';

const cx = classNames.bind(styles);

const safeSetDisplayName = (value) => {
    if (!value) return;
    try {
        localStorage.setItem('displayName', value);
        window.dispatchEvent(new CustomEvent('displayNameUpdated'));
    } catch (_) {
        // Ignore storage errors (private mode, etc.)
    }
};

function StaffProfile() {
    const navigate = useNavigate();
    const { success, error } = notifier;
    const [profile, setProfile] = useState({
        id: null,
        fullName: '',
        email: '',
        phoneNumber: '',
        address: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [forceChange, setForceChange] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showForceNewPassword, setShowForceNewPassword] = useState(false);
    const [showForceConfirmPassword, setShowForceConfirmPassword] = useState(false);
    const token = storage.get('token') || sessionStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/', { replace: true });
            return;
        }
        (async () => {
            try {
                const p = (await getMyInfo()) || {};
                setProfile({
                    id: p.id ?? p.userId ?? null,
                    fullName: p.fullName || '',
                    email: p.email || '',
                    phoneNumber: p.phoneNumber || '',
                    address: p.address || '',
                });

                // If backend sends a flag for first login, respect it.
                // Temporary: infer first-login if password must be changed (backend may send p.mustChangePassword)
                if (p.mustChangePassword) setForceChange(true);
            } catch (_) { }
        })();
    }, [token, navigate]);

    const handleSaveProfile = async () => {
        if (!profile.id) {
            error('Không xác định được tài khoản. Vui lòng tải lại trang.');
            return;
        }
        setIsSaving(true);
        try {
            const updatedData = await updateUser(profile.id, {
                fullName: profile.fullName,
                phoneNumber: profile.phoneNumber,
                address: profile.address,
            });

            if (updatedData) {

                if (updatedData) {
                    setProfile((prev) => ({
                        ...prev,
                        fullName: updatedData.fullName ?? prev.fullName,
                        phoneNumber: updatedData.phoneNumber ?? prev.phoneNumber,
                        address: updatedData.address ?? prev.address,
                    }));
                    if (updatedData.fullName) {
                        safeSetDisplayName(updatedData.fullName);
                    }
                } else {
                    // Không có payload nhưng vẫn cập nhật theo state hiện tại
                    if (profile.fullName) {
                        safeSetDisplayName(profile.fullName);
                    }
                }

                success('Lưu thay đổi thành công');
            } else {
                error('Lỗi lưu hồ sơ');
            }
        } catch (e) {
            error('Không thể kết nối máy chủ.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            error('Mật khẩu mới không khớp');
            return;
        }
        try {
            await changePassword(oldPassword, newPassword);
            success('Cập nhật mật khẩu thành công');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setForceChange(false);
            setShowOldPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setShowForceNewPassword(false);
            setShowForceConfirmPassword(false);
        } catch (_) {
            error('Không thể kết nối máy chủ');
        }
    };

    return (
        <>
            <div className={cx('profile-staff-page')}>
                <div className={cx('page-header')}>
                    <h1 className={cx('page-title')}>Hồ sơ cá nhân</h1>
                    <button className={cx('dashboard-btn')} onClick={() => navigate('/staff')}>
                        <span className={cx('icon-left')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                        Dashboard
                    </button>
                </div>

                <div className={cx('grid')}>
                    <div className={cx('card')}>
                        <div className={cx('card-head')}>Thông tin</div>
                        <div className={cx('form-group')}>
                            <label>Họ tên</label>
                            <input
                                name="fullName"
                                autoComplete="off"
                                value={profile.fullName}
                                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                            />
                        </div>
                        <div className={cx('form-group')}>
                            <label>Email</label>
                            <input
                                name="email"
                                autoComplete="off"
                                value={profile.email}
                                disabled
                            />
                        </div>
                        <div className={cx('form-group')}>
                            <label>SDT</label>
                            <input
                                name="phone"
                                autoComplete="off"
                                value={profile.phoneNumber}
                                onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                            />
                        </div>

                        <div className={cx('actions')}>
                            <button className={cx('btn', 'btn-muted')} onClick={() => window.history.back()}>Hủy</button>
                            <button className={cx('btn', 'btn-primary')} onClick={handleSaveProfile} disabled={isSaving}>
                                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>

                    <div className={cx('card')}>
                        <div className={cx('card-head')}>Đổi mật khẩu</div>
                        <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
                            {/* Hidden dummy field to suppress browser autofill */}
                            <input type="password" style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, opacity: 0 }} autoComplete="new-password" />

                            <div className={cx('form-group')}>
                                <label>Mật khẩu hiện tại</label>
                                <div className={cx('input-wrap')}>
                                    <input
                                        type={showOldPassword ? 'text' : 'password'}
                                        name="current_password_block_autofill"
                                        autoComplete="off"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={cx('toggle-visibility')}
                                        onClick={() => setShowOldPassword((prev) => !prev)}
                                        aria-label={showOldPassword ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                                    >
                                        <FontAwesomeIcon icon={showOldPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                            </div>
                            <div className={cx('form-group')}>
                                <label>Mật khẩu mới</label>
                                <div className={cx('input-wrap')}>
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        name="new_password"
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={cx('toggle-visibility')}
                                        onClick={() => setShowNewPassword((prev) => !prev)}
                                        aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                                    >
                                        <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                            </div>
                            <div className={cx('form-group')}>
                                <label>Nhập lại mật khẩu mới</label>
                                <div className={cx('input-wrap')}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirm_new_password"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={cx('toggle-visibility')}
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    >
                                        <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                            </div>
                            <div className={cx('actions')}>
                                <button type="submit" className={cx('btn', 'btn-primary')}>Cập nhật mật khẩu</button>
                            </div>
                        </form>
                    </div>
                </div>

                {forceChange && (
                    <div className={cx('modal-overlay')} role="dialog" aria-modal="true">
                        <div className={cx('modal')}>
                            <h3 className={cx('modal-title')}>Bạn cần đổi mật khẩu lần đầu</h3>
                            <p className={cx('modal-desc')}>Vui lòng đặt mật khẩu mới để tiếp tục sử dụng hệ thống.</p>
                            <div className={cx('form-group')}>
                                <label>Mật khẩu mới</label>
                                <div className={cx('input-wrap')}>
                                    <input
                                        type={showForceNewPassword ? 'text' : 'password'}
                                        name="first-new-password"
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={cx('toggle-visibility')}
                                        onClick={() => setShowForceNewPassword((prev) => !prev)}
                                        aria-label={showForceNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                                    >
                                        <FontAwesomeIcon icon={showForceNewPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                            </div>
                            <div className={cx('form-group')}>
                                <label>Nhập lại mật khẩu mới</label>
                                <div className={cx('input-wrap')}>
                                    <input
                                        type={showForceConfirmPassword ? 'text' : 'password'}
                                        name="first-confirm-new-password"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={cx('toggle-visibility')}
                                        onClick={() => setShowForceConfirmPassword((prev) => !prev)}
                                        aria-label={showForceConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    >
                                        <FontAwesomeIcon icon={showForceConfirmPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                            </div>
                            <div className={cx('modal-actions')}>
                                <button className={cx('btn', 'btn-primary')} onClick={handleChangePassword}>Đổi mật khẩu</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default StaffProfile;

