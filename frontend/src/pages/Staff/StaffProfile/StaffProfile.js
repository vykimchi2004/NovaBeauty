import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import styles from './StaffProfile.module.scss';
import { storage, validatePassword } from '~/services/utils';
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
    const [isEditing, setIsEditing] = useState(false);
    const [originalProfile, setOriginalProfile] = useState(null);
    const [phoneError, setPhoneError] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [oldPasswordError, setOldPasswordError] = useState('');
    const [newPasswordError, setNewPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
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
                const profileData = {
                    id: p.id ?? p.userId ?? null,
                    fullName: p.fullName || '',
                    email: p.email || '',
                    phoneNumber: p.phoneNumber || '',
                    address: p.address || '',
                };
                setProfile(profileData);
                setOriginalProfile(profileData);

                // If backend sends a flag for first login, respect it.
                // Temporary: infer first-login if password must be changed (backend may send p.mustChangePassword)
                if (p.mustChangePassword) setForceChange(true);
            } catch (_) { }
        })();
    }, [token, navigate]);

    const handleEdit = () => {
        setOriginalProfile({ ...profile });
        setIsEditing(true);
        setPhoneError('');
    };

    const handleCancelEdit = () => {
        if (originalProfile) {
            setProfile({ ...originalProfile });
        }
        setIsEditing(false);
        setPhoneError('');
    };

    const handleSaveProfile = async () => {
        if (!profile.id) {
            error('Không xác định được tài khoản. Vui lòng tải lại trang.');
            return;
        }
        
        // Validate số điện thoại nếu có
        setPhoneError('');
        if (profile.phoneNumber && profile.phoneNumber.trim()) {
            const phoneNumber = profile.phoneNumber.trim();
            const phoneRegex = /^0[0-9]{9}$/;
            if (!phoneRegex.test(phoneNumber)) {
                setPhoneError('Hãy nhập số điện thoại bắt đầu từ 0 và đủ 10 số');
                return;
            }
        }
        
        setIsSaving(true);
        try {
            const updatedData = await updateUser(profile.id, {
                fullName: profile.fullName,
                phoneNumber: profile.phoneNumber,
                address: profile.address,
            });

            if (updatedData) {
                const newProfileData = {
                    id: profile.id,
                    fullName: updatedData.fullName ?? profile.fullName,
                    email: profile.email,
                    phoneNumber: updatedData.phoneNumber ?? profile.phoneNumber,
                    address: updatedData.address ?? profile.address,
                };
                setProfile(newProfileData);
                setOriginalProfile(newProfileData);
                
                if (updatedData.fullName) {
                    safeSetDisplayName(updatedData.fullName);
                }

                success('Lưu thay đổi thành công');
                setIsEditing(false);
                setPhoneError('');
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
        // Reset errors
        setOldPasswordError('');
        setNewPasswordError('');
        setConfirmPasswordError('');

        let hasError = false;

        // Validate mật khẩu hiện tại (chỉ khi không phải force change)
        if (!forceChange) {
            if (!oldPassword || !oldPassword.trim()) {
                setOldPasswordError('Vui lòng nhập mật khẩu hiện tại');
                hasError = true;
            }
        }

        // Validate mật khẩu mới
        if (!newPassword || !newPassword.trim()) {
            setNewPasswordError('Vui lòng nhập mật khẩu mới');
            hasError = true;
        } else {
            // Validate mật khẩu mới theo quy tắc
            const passwordValidation = validatePassword(newPassword, confirmPassword);
            if (!passwordValidation.isValid) {
                // Nếu lỗi là về khớp mật khẩu, hiển thị ở confirm field
                if (passwordValidation.error.includes('không khớp')) {
                    setConfirmPasswordError(passwordValidation.error);
                } else {
                    setNewPasswordError(passwordValidation.error);
                }
                hasError = true;
            }
        }

        // Validate xác nhận mật khẩu
        if (!confirmPassword || !confirmPassword.trim()) {
            setConfirmPasswordError('Vui lòng xác nhận mật khẩu mới');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        try {
            // Khi force change, không gọi changePassword API (cần endpoint riêng hoặc xử lý khác)
            // Hiện tại chỉ cho phép đổi mật khẩu khi có mật khẩu hiện tại
            if (forceChange) {
                // TODO: Cần có endpoint riêng cho force change password hoặc xử lý khác
                setNewPasswordError('Vui lòng liên hệ quản trị viên để đặt lại mật khẩu');
                return;
            }

            // Luôn yêu cầu mật khẩu hiện tại khi không phải force change
            if (!oldPassword || !oldPassword.trim()) {
                setOldPasswordError('Vui lòng nhập mật khẩu hiện tại');
                return;
            }

            const result = await changePassword(oldPassword, newPassword);
            
            // Kiểm tra lại result để đảm bảo không có lỗi
            // (phòng trường hợp apiClient không throw error khi backend trả về HTTP 200 với code 400)
            if (result && typeof result === 'object' && 'code' in result) {
                if (result.code !== 200 && result.code !== 201) {
                    const errorMessage = result.message || 'Đổi mật khẩu thất bại';
                    const rawMessage = errorMessage;
                    const lowerMessage = rawMessage.toLowerCase();
                    
                    // Kiểm tra các pattern liên quan đến mật khẩu hiện tại sai
                    // Backend có thể trả về message với encoding khác nhau
                    // Kiểm tra bằng cách tìm các từ khóa chính
                    const hasCurrentPasswordKeyword = 
                        rawMessage.indexOf('Mật khẩu hiện tại') !== -1 ||
                        rawMessage.indexOf('hiện tại') !== -1 ||
                        lowerMessage.indexOf('mật khẩu hiện tại') !== -1 || 
                        lowerMessage.indexOf('current password') !== -1;
                    
                    const hasIncorrectKeyword = 
                        rawMessage.indexOf('không đúng') !== -1 ||
                        lowerMessage.indexOf('không đúng') !== -1 ||
                        lowerMessage.indexOf('incorrect') !== -1 ||
                        lowerMessage.indexOf('sai') !== -1 ||
                        lowerMessage.indexOf('wrong') !== -1;
                    
                    const isCurrentPasswordError = hasCurrentPasswordKeyword || 
                        (hasIncorrectKeyword && (lowerMessage.indexOf('password') !== -1 && 
                         (lowerMessage.indexOf('current') !== -1 || lowerMessage.indexOf('old') !== -1)));
                    
                    if (isCurrentPasswordError) {
                        // Hiển thị lỗi ở đúng chỗ: dưới input "Mật khẩu hiện tại"
                        setOldPasswordError('Mật khẩu hiện tại không đúng');
                        // Xóa lỗi ở các field khác
                        setNewPasswordError('');
                        setConfirmPasswordError('');
                    } else {
                        setNewPasswordError(errorMessage);
                        setOldPasswordError('');
                        setConfirmPasswordError('');
                    }
                    return;
                }
            }
            
            success('Cập nhật mật khẩu thành công');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setOldPasswordError('');
            setNewPasswordError('');
            setConfirmPasswordError('');
            setForceChange(false);
            setShowOldPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setShowForceNewPassword(false);
            setShowForceConfirmPassword(false);
        } catch (err) {
            // Xử lý lỗi từ backend
            console.error('Error changing password:', err);
            
            // Lấy message từ nhiều nguồn có thể
            let errorMessage = '';
            if (err?.response?.message) {
                errorMessage = err.response.message;
            } else if (err?.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err?.message) {
                errorMessage = err.message;
            } else {
                errorMessage = 'Không thể kết nối máy chủ';
            }
            
            // Kiểm tra message gốc (có thể có encoding issue từ backend)
            // Backend có thể trả về: "Máº­t kháº©u hiá»‡n táº¡i khÃ´ng Ä'Ãºng"
            // Cần nhận diện dựa trên pattern, không phải exact match
            const rawMessage = errorMessage;
            const lowerMessage = rawMessage.toLowerCase();
            
            // Kiểm tra các pattern liên quan đến mật khẩu hiện tại sai
            // Sử dụng indexOf để tránh lỗi encoding trong code
            const hasCurrentPasswordKeyword = 
                rawMessage.indexOf('Mật khẩu hiện tại') !== -1 ||
                rawMessage.indexOf('hiện tại') !== -1 ||
                lowerMessage.indexOf('mật khẩu hiện tại') !== -1 ||
                lowerMessage.indexOf('current password') !== -1;
            
            const hasIncorrectKeyword = 
                rawMessage.indexOf('không đúng') !== -1 ||
                lowerMessage.indexOf('không đúng') !== -1 ||
                lowerMessage.indexOf('incorrect') !== -1 ||
                lowerMessage.indexOf('sai') !== -1 ||
                lowerMessage.indexOf('wrong') !== -1 ||
                lowerMessage.indexOf('invalid') !== -1;
            
            const isCurrentPasswordError = hasCurrentPasswordKeyword || 
                (hasIncorrectKeyword && lowerMessage.indexOf('password') !== -1 && 
                 (lowerMessage.indexOf('current') !== -1 || lowerMessage.indexOf('old') !== -1));
            
            if (isCurrentPasswordError) {
                // Hiển thị lỗi ở đúng chỗ: dưới input "Mật khẩu hiện tại"
                setOldPasswordError('Mật khẩu hiện tại không đúng');
                // Xóa lỗi ở các field khác
                setNewPasswordError('');
                setConfirmPasswordError('');
            } else if (lowerMessage.indexOf('mật khẩu mới') !== -1 || lowerMessage.indexOf('new password') !== -1) {
                setNewPasswordError(errorMessage);
                setOldPasswordError('');
                setConfirmPasswordError('');
            } else {
                // Lỗi khác, hiển thị ở field mật khẩu mới
                setNewPasswordError(errorMessage);
                setOldPasswordError('');
                setConfirmPasswordError('');
            }
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
                        <div className={cx('card-head')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Thông tin</span>
                            {!isEditing && (
                                <button className={cx('btn', 'btn-primary')} onClick={handleEdit} style={{ padding: '6px 16px', fontSize: '14px' }}>
                                    Sửa
                                </button>
                            )}
                        </div>
                        <div className={cx('form-group')}>
                            <label>Họ tên</label>
                            <input
                                name="fullName"
                                autoComplete="off"
                                value={profile.fullName}
                                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                disabled={!isEditing}
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
                                type="tel"
                                autoComplete="off"
                                value={profile.phoneNumber}
                                onChange={(e) => {
                                    // Chỉ cho phép nhập số
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    // Giới hạn 10 ký tự
                                    const limitedValue = value.slice(0, 10);
                                    setProfile({ ...profile, phoneNumber: limitedValue });
                                    if (phoneError) setPhoneError('');
                                }}
                                onKeyPress={(e) => {
                                    // Chỉ cho phép nhập số
                                    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                                        e.preventDefault();
                                    }
                                }}
                                placeholder="Nhập SĐT (bắt đầu bằng 0, 10 số)"
                                maxLength={10}
                                disabled={!isEditing}
                            />
                            {phoneError && (
                                <div style={{ 
                                    color: '#dc3545', 
                                    fontSize: '12px', 
                                    marginTop: '4px',
                                    fontWeight: '400',
                                    lineHeight: '1.5'
                                }}>
                                    {phoneError}
                                </div>
                            )}
                        </div>
                        <div className={cx('form-group')}>
                            <label>Địa chỉ</label>
                            <textarea
                                name="address"
                                autoComplete="off"
                                value={profile.address}
                                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                placeholder="Nhập địa chỉ"
                                rows="3"
                                disabled={!isEditing}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    minHeight: '80px'
                                }}
                            />
                        </div>

                        {isEditing && (
                            <div className={cx('actions')}>
                                <button className={cx('btn', 'btn-muted')} onClick={handleCancelEdit} disabled={isSaving}>
                                    Hủy
                                </button>
                                <button className={cx('btn', 'btn-primary')} onClick={handleSaveProfile} disabled={isSaving}>
                                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        )}
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
                                        onChange={(e) => {
                                            setOldPassword(e.target.value);
                                            if (oldPasswordError) setOldPasswordError('');
                                        }}
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
                            </div>
                            <div className={cx('form-group')}>
                                <label>Mật khẩu mới</label>
                                <div className={cx('input-wrap')}>
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        name="new_password"
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            if (newPasswordError) setNewPasswordError('');
                                        }}
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
                                {newPasswordError && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{newPasswordError}</div>}
                            </div>
                            <div className={cx('form-group')}>
                                <label>Nhập lại mật khẩu mới</label>
                                <div className={cx('input-wrap')}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirm_new_password"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (confirmPasswordError) setConfirmPasswordError('');
                                        }}
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
                                {confirmPasswordError && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{confirmPasswordError}</div>}
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
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            if (newPasswordError) setNewPasswordError('');
                                        }}
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
                                {newPasswordError && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{newPasswordError}</div>}
                            </div>
                            <div className={cx('form-group')}>
                                <label>Nhập lại mật khẩu mới</label>
                                <div className={cx('input-wrap')}>
                                    <input
                                        type={showForceConfirmPassword ? 'text' : 'password'}
                                        name="first-confirm-new-password"
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (confirmPasswordError) setConfirmPasswordError('');
                                        }}
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
                                {confirmPasswordError && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{confirmPasswordError}</div>}
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

