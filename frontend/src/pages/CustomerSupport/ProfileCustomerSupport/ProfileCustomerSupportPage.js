import React, { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './ProfileCustomerSupportPage.module.scss';
import { useNavigate } from 'react-router-dom';
import Notification from '../../../components/Common/Notification/Notification';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { getApiBaseUrl, getStoredToken } from '../../../services/utils';
import { useNotification } from '../../../components/Common/Notification';

const cx = classNames.bind(styles);

const API_BASE_URL = getApiBaseUrl();

function ProfileCustomerSupportPage() {
    const navigate = useNavigate();
    const { success, error, notify } = useNotification();

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
    const [notif, setNotif] = useState({ open: false, type: 'success', title: '', message: '', duration: 3000 });
    const [, setStoredDisplayName] = useLocalStorage('displayName', null);

    const token = getStoredToken('token') || sessionStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/', { replace: true });
            return;
        }
        (async () => {
            try {
                const me = await fetch(`${API_BASE_URL}/users/my-info`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                const meData = await me.json().catch(() => ({}));
                const p = meData?.result || meData || {};
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
            setNotif({ open: true, type: 'error', title: 'Lỗi', message: 'Không xác định được tài khoản. Vui lòng tải lại trang.', duration: 4000 });
            return;
        }
        setIsSaving(true);
        try {
            const resp = await fetch(`${API_BASE_URL}/users/${profile.id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName: profile.fullName,
                    phoneNumber: profile.phoneNumber,
                    address: profile.address,
                }),
            });
            if (resp.ok) {
                let updatedData = null;
                try {
                    const payload = await resp.json().catch(() => null);
                    updatedData = payload?.result || payload || null;
                } catch (_) {
                    updatedData = null;
                }

                if (updatedData) {
                    setProfile((prev) => ({
                        ...prev,
                        fullName: updatedData.fullName ?? prev.fullName,
                        phoneNumber: updatedData.phoneNumber ?? prev.phoneNumber,
                        address: updatedData.address ?? prev.address,
                    }));
                    if (updatedData.fullName) {
                        setStoredDisplayName(updatedData.fullName);
                        try {
                            localStorage.setItem('displayName', updatedData.fullName);
                        } catch (_) {}
                        window.dispatchEvent(new CustomEvent('displayNameUpdated'));
                    }
                } else {
                    // Không có payload nhưng vẫn cập nhật theo state hiện tại
                    if (profile.fullName) {
                        setStoredDisplayName(profile.fullName);
                        try {
                            localStorage.setItem('displayName', profile.fullName);
                        } catch (_) {}
                        window.dispatchEvent(new CustomEvent('displayNameUpdated'));
                    }
                }

                setNotif({ open: true, type: 'success', title: 'Thành công', message: 'Đã lưu thay đổi hồ sơ', duration: 2500 });
                success('Lưu thay đổi thành công');
            } else {
                const data = await resp.json().catch(() => ({}));
                error(`Lỗi lưu hồ sơ: ${data?.message || resp.status}`);
            }
        } catch (e) {
            notify('error', 'Không thể kết nối máy chủ.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            notify('error', 'Mật khẩu mới không khớp');
            return;
        }
        try {
            const resp = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ currentPassword: oldPassword, newPassword }),
            });
            if (resp.ok) {
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
            } else {
                const data = await resp.json().catch(() => ({}));
                error(`Đổi mật khẩu thất bại: ${data?.message || resp.status}`);
            }
        } catch (_) {

            setNotif({ open: true, type: 'error', title: 'Lỗi', message: 'Không thể kết nối máy chủ', duration: 3500 });
        }
    };

    return (
        <>
        <div className={cx('profile-customer-support-page')}>
            <div className={cx('page-header')}>
                <h1 className={cx('page-title')}>Hồ sơ cá nhân</h1>
                <button className={cx('dashboard-btn')} onClick={() => navigate('/customer-support')}>
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
                                    {showOldPassword ? 'Ẩn' : 'Hiện'}
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
                                    {showNewPassword ? 'Ẩn' : 'Hiện'}
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
                                    {showConfirmPassword ? 'Ẩn' : 'Hiện'}
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
                                    {showForceNewPassword ? 'Ẩn' : 'Hiện'}
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
                                    {showForceConfirmPassword ? 'Ẩn' : 'Hiện'}
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
        <Notification
            open={notif.open}
            type={notif.type}
            title={notif.title}
            message={notif.message}
            duration={notif.duration}
            onClose={() => setNotif((prev) => ({ ...prev, open: false }))}
        />
        </>
    );
}

export default ProfileCustomerSupportPage;

