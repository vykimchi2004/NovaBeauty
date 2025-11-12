import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faClipboardList,
  faLock,
  faFileLines,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import styles from './Profile.module.scss';
import { getMyInfo, updateUser } from '~/services/user';
import { logout } from '~/services/auth';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import {
  STATUS_CLASS_MAP,
  ORDERS_DATA,
  PLACEHOLDER_CONTENT,
} from './constants';
import ProfileSection from './sections/ProfileSection';
import PasswordSection from './sections/PasswordSection';
import OrdersSection from './sections/OrdersSection';

const cx = classNames.bind(styles);

const MENU_ITEMS = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: faUser },
  { id: 'orders', label: 'Lịch sử mua hàng', icon: faClipboardList },
  { id: 'password', label: 'Đổi mật khẩu', icon: faLock },
  { id: 'complaint', label: 'Đơn khiếu nại', icon: faFileLines },
];

function ProfilePage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [initialProfile, setInitialProfile] = useState(null);
  const [profileMessage, setProfileMessage] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [userId, setUserId] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');

  const getStatusClass = (status) => STATUS_CLASS_MAP[status] || '';

  const handleSectionSelect = (sectionId) => {
    setActiveSection(sectionId);
  };

  const handleSectionKeyDown = (event, sectionId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSectionSelect(sectionId);
    }
  };

  const handleLogoutKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleLogout();
    }
  };

  const handleProfileChange = (field, value) => {
    if (!isEditingProfile) return;
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileSectionChange = (field, value) => {
    if (field === '__toggle_edit__') {
      setIsEditingProfile(true);
      return;
    }
    handleProfileChange(field, value);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!userId) return;

    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const payload = {
        fullName: profileForm.fullName?.trim() || '',
        phone: profileForm.phone?.trim() || '',
        address: profileForm.address?.trim() || '',
      };

      const updatedUser = await updateUser(userId, payload);
      setInitialProfile(updatedUser);
      setProfileForm({
        fullName: updatedUser?.fullName || '',
        email: updatedUser?.email || profileForm.email,
        phone: updatedUser?.phone || '',
        address: updatedUser?.address || '',
      });
      storage.set(STORAGE_KEYS.USER, updatedUser);
      setProfileMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      setIsEditingProfile(false);
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (error) {
      setProfileMessage({
        type: 'error',
        text: error?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelProfileEdit = () => {
    if (initialProfile) {
      setProfileForm({
        fullName: initialProfile.fullName || '',
        email: initialProfile.email || '',
        phone: initialProfile.phone || '',
        address: initialProfile.address || '',
      });
    }
    setIsEditingProfile(false);
    setProfileMessage(null);
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();

    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordMessage('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMessage('Xác nhận mật khẩu chưa khớp.');
      return;
    }

    setPasswordMessage('Đổi mật khẩu thành công!');
    setPasswordForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setPasswordMessage(''), 3000);
  };

  const handleLogout = async () => {
    try {
      await logout().catch(() => {});
    } finally {
      storage.remove(STORAGE_KEYS.TOKEN);
      storage.remove(STORAGE_KEYS.USER);
      navigate('/', { replace: true });
      // Ensure state resets even if SPA navigation caches something
      setTimeout(() => {
        try { window.location.assign('/'); } catch (_) {}
      }, 0);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const ensureAuthenticated = () => {
      const token = storage.get(STORAGE_KEYS.TOKEN, null);
      if (!token) {
        storage.remove(STORAGE_KEYS.USER);
        navigate('/', { replace: true });
        return false;
      }
      return true;
    };

    if (!ensureAuthenticated()) {
      return () => {
        isMounted = false;
      };
    }

    const loadProfile = async () => {
      setIsProfileLoading(true);
      setProfileError('');

      try {
        const cachedUser = storage.get(STORAGE_KEYS.USER, null);
        let userInfo = cachedUser;

        if (!userInfo || !userInfo.email) {
          userInfo = await getMyInfo();
        }

        if (!isMounted) {
          return;
        }

        if (!userInfo) {
          storage.remove(STORAGE_KEYS.USER);
          storage.remove(STORAGE_KEYS.TOKEN);
          navigate('/', { replace: true });
          return;
        }

        setUserId(userInfo.id);
        setInitialProfile(userInfo);
        setProfileForm({
          fullName: userInfo.fullName || '',
          email: userInfo.email || '',
          phone: userInfo.phone || '',
          address: userInfo.address || '',
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error?.code === 401 || error?.code === 403) {
          storage.remove(STORAGE_KEYS.USER);
          storage.remove(STORAGE_KEYS.TOKEN);
          navigate('/', { replace: true });
        } else {
          setProfileError('Không thể tải thông tin tài khoản.');
        }
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const renderContent = () => {
    if (activeSection === 'password') {
      return (
        <PasswordSection
          passwordForm={passwordForm}
          passwordMessage={passwordMessage}
          onChange={handlePasswordChange}
          onSubmit={handlePasswordSubmit}
        />
      );
    }

    if (activeSection === 'orders') {
      return <OrdersSection orders={ORDERS_DATA} getStatusClass={getStatusClass} />;
    }

    const placeholder = PLACEHOLDER_CONTENT[activeSection];
    if (placeholder) {
      return (
        <div className={cx('card')}>
          <div className={cx('cardHeader')}>
            <h2>{placeholder.title}</h2>
          </div>
          <p>{placeholder.description}</p>
        </div>
      );
    }

    if (isProfileLoading) {
      return (
        <div className={cx('card')}>
          <p>Đang tải thông tin tài khoản...</p>
        </div>
      );
    }

    if (profileError) {
      return (
        <div className={cx('card')}>
          <p>{profileError}</p>
        </div>
      );
    }

    return (
      <ProfileSection
        isEditingProfile={isEditingProfile}
        isSavingProfile={isSavingProfile}
        profileForm={profileForm}
        profileMessage={profileMessage}
        onCancelEdit={handleCancelProfileEdit}
        onChange={handleProfileSectionChange}
        onSubmit={handleProfileSubmit}
      />
    );
  };

  return (
    <div className={cx('container')}>
      <aside className={cx('sidebar')}>
        <div className={cx('sidebarBox')}>
          <div className={cx('sidebarProfile')}>
            <div className={cx('sidebarInfo')}>
              <p className={cx('sidebarName')}>
                {profileForm.fullName || initialProfile?.fullName || 'Người dùng Nova'}
              </p>
              <span className={cx('sidebarEmail')}>
                {profileForm.email || initialProfile?.email || 'Chưa cập nhật email'}
              </span>
            </div>
          </div>

          <div className={cx('sidebarMenu')}>
            {MENU_ITEMS.map((item) => (
              <div
                key={item.id}
                className={cx(
                  'sidebarItem',
                  activeSection === item.id && 'sidebarItemActive',
                )}
                onClick={() => handleSectionSelect(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => handleSectionKeyDown(event, item.id)}
              >
                <FontAwesomeIcon icon={item.icon} className={cx('sidebarIcon')} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div
            className={cx('sidebarItem', 'logoutItem')}
            onClick={handleLogout}
            role="button"
            tabIndex={0}
            onKeyDown={handleLogoutKeyDown}
          >
            <FontAwesomeIcon icon={faRightFromBracket} className={cx('sidebarIcon')} />
            <span>Đăng xuất</span>
          </div>
        </div>
      </aside>

      <section className={cx('content')}>
        {renderContent()}
      </section>
    </div>
  );
}

export default ProfilePage;
