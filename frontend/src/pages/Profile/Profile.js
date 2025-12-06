import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faClipboardList,
  faLock,
  faFileLines,
  faRightFromBracket,
  faTicket,
} from '@fortawesome/free-solid-svg-icons';
import styles from './Profile.module.scss';
import { getMyInfo, updateUser } from '~/services/user';
import { logout, changePassword } from '~/services/auth';
import { storage, validatePassword } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import notifier from '~/utils/notification';
import { getMyAddresses, formatFullAddress, setDefaultAddress } from '~/services/address';
import ProfileSection from './sections/ProfileSection';
import PasswordSection from './sections/PasswordSection';
import OrdersSection from './sections/OrdersSection';
import ComplaintSection from './sections/ComplaintSection';
import VouchersSection from './sections/VouchersSection';

const cx = classNames.bind(styles);

// Constants
const STATUS_CLASS_MAP = {
  'Chờ xác nhận': 'pending',
  'Chờ lấy hàng': 'ready',
  'Đang giao hàng': 'shipping',
  'Đã giao': 'delivered',
  'Trả hàng': 'returned',
  'Đã hủy': 'cancelled',
};

const PLACEHOLDER_CONTENT = {
  complaint: {
    title: 'Đơn khiếu nại',
    description: 'Bạn sẽ sớm có thể gửi và theo dõi các đơn khiếu nại tại đây.',
  },
};

const normalizeUserProfile = (user = {}) => ({
  fullName: user.fullName || '',
  email: user.email || '',
  phone: user.phone ?? user.phoneNumber ?? '',
  address: user.address || '',
});

const MENU_ITEMS = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: faUser },
  { id: 'orders', label: 'Lịch sử mua hàng', icon: faClipboardList },
  { id: 'vouchers', label: 'Voucher/Khuyến mãi', icon: faTicket },
  { id: 'password', label: 'Đổi mật khẩu', icon: faLock },
  { id: 'complaint', label: 'Đơn khiếu nại', icon: faFileLines },
];

function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { success } = notifier;
  
  // Get section from URL query params, location state, or default to 'profile'
  const getInitialSection = () => {
    const searchParams = new URLSearchParams(location.search);
    const sectionFromUrl = searchParams.get('section');
    const sectionFromState = location.state?.section;
    // Priority: URL query param > location state > default 'profile'
    return sectionFromUrl || sectionFromState || 'profile';
  };
  
  const [activeSection, setActiveSection] = useState(() => getInitialSection());
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
  const [phoneError, setPhoneError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [oldPasswordError, setOldPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressList, setShowAddressList] = useState(false);

  const getStatusClass = (status) => STATUS_CLASS_MAP[status] || '';

  // Persist default address when selected
  const persistDefaultAddress = async (address) => {
    if (!address) return;
    const addressId = address.id || address.addressId || address.address_id;
    if (!addressId) return;
    if (address.defaultAddress) return;

    try {
      await setDefaultAddress(addressId);
      setAddressRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Không thể cập nhật địa chỉ mặc định', err);
    }
  };

  const handleSectionSelect = (sectionId) => {
    setActiveSection(sectionId);
    // Update URL query params to persist section on reload
    const searchParams = new URLSearchParams(location.search);
    if (sectionId === 'profile') {
      searchParams.delete('section');
    } else {
      searchParams.set('section', sectionId);
    }
    const newSearch = searchParams.toString();
    navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
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
      handleLogoutClick();
    }
  };

  const handleProfileChange = (field, value) => {
    if (!isEditingProfile) return;
    if (field === 'phone' && phoneError) {
      setPhoneError('');
    }
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

    setPhoneError('');
    // Validate số điện thoại nếu có
    if (profileForm.phone && profileForm.phone.trim()) {
      const phoneNumber = profileForm.phone.trim();
      const phoneRegex = /^0[0-9]{9}$/;
      if (!phoneRegex.test(phoneNumber)) {
        setPhoneError('Hãy nhập số điện thoại bắt đầu từ 0 và đủ 10 số');
        return;
      }
    }

    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const payload = {
        fullName: profileForm.fullName?.trim() || '',
        phoneNumber: profileForm.phone?.trim() || '',
        address: profileForm.address?.trim() || '',
      };

      const updatedUser = await updateUser(userId, payload);
      const normalizedUpdated = normalizeUserProfile({
        ...updatedUser,
        email: updatedUser?.email || profileForm.email,
      });
      setInitialProfile(normalizedUpdated);
      setProfileForm(normalizedUpdated);
      storage.set(STORAGE_KEYS.USER, {
        ...updatedUser,
        phone: normalizedUpdated.phone,
        phoneNumber: normalizedUpdated.phone,
      });
      success('Cập nhật thông tin thành công!');
      setProfileMessage(null);
      setIsEditingProfile(false);
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
      setProfileForm({ ...initialProfile });
    }
    setIsEditingProfile(false);
    setProfileMessage(null);
    setPhoneError('');
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordFieldChange = (field) => {
    // Xóa lỗi khi người dùng bắt đầu nhập lại
    if (field === 'current') {
      setOldPasswordError('');
    } else if (field === 'next') {
      setNewPasswordError('');
    } else if (field === 'confirm') {
      setConfirmPasswordError('');
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    // Reset tất cả lỗi
    setOldPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setPasswordMessage('');

    let hasError = false;

    // Validate mật khẩu hiện tại
    if (!passwordForm.current || !passwordForm.current.trim()) {
      setOldPasswordError('Vui lòng nhập mật khẩu hiện tại');
      hasError = true;
    }

    // Validate mật khẩu mới
    if (!passwordForm.next || !passwordForm.next.trim()) {
      setNewPasswordError('Vui lòng nhập mật khẩu mới');
      hasError = true;
    } else {
      // Validate mật khẩu mới theo quy tắc
      const passwordValidation = validatePassword(passwordForm.next, passwordForm.confirm);
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
    if (!passwordForm.confirm || !passwordForm.confirm.trim()) {
      setConfirmPasswordError('Vui lòng xác nhận mật khẩu mới');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await changePassword(passwordForm.current, passwordForm.next);
      
      // Kiểm tra lại result để đảm bảo không có lỗi
      if (result && typeof result === 'object' && 'code' in result) {
        if (result.code !== 200 && result.code !== 201) {
          const errorMessage = result.message || 'Đổi mật khẩu thất bại';
          const rawMessage = errorMessage;
          const lowerMessage = rawMessage.toLowerCase();
          
          // Kiểm tra các pattern liên quan đến mật khẩu hiện tại sai
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
            setOldPasswordError('Mật khẩu hiện tại không đúng');
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
      setPasswordForm({ current: '', next: '', confirm: '' });
      setOldPasswordError('');
      setNewPasswordError('');
      setConfirmPasswordError('');
      setPasswordMessage('');
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
      
      const rawMessage = errorMessage;
      const lowerMessage = rawMessage.toLowerCase();
      
      // Kiểm tra các pattern liên quan đến mật khẩu hiện tại sai
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
        setOldPasswordError('Mật khẩu hiện tại không đúng');
        setNewPasswordError('');
        setConfirmPasswordError('');
      } else if (lowerMessage.indexOf('mật khẩu mới') !== -1 || lowerMessage.indexOf('new password') !== -1) {
        setNewPasswordError(errorMessage);
        setOldPasswordError('');
        setConfirmPasswordError('');
      } else {
        setNewPasswordError(errorMessage);
        setOldPasswordError('');
        setConfirmPasswordError('');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
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

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  // Sync activeSection with URL query params when URL changes (e.g., browser back/forward or reload)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sectionFromUrl = searchParams.get('section');
    const sectionToUse = sectionFromUrl || 'profile';
    // Always sync with URL to ensure reload keeps the correct section
    setActiveSection(sectionToUse);
  }, [location.search]);

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
        
        // Fetch addresses to find default address
        try {
          const addresses = await getMyAddresses();
          if (Array.isArray(addresses) && addresses.length > 0) {
            const defaultAddress = addresses.find((addr) => addr?.defaultAddress === true);
            if (defaultAddress) {
              userInfo.address = formatFullAddress(defaultAddress);
              // Cập nhật số điện thoại từ địa chỉ mặc định nếu có
              if (defaultAddress.recipientPhoneNumber) {
                userInfo.phone = defaultAddress.recipientPhoneNumber;
                userInfo.phoneNumber = defaultAddress.recipientPhoneNumber;
              }
              setSelectedAddress(defaultAddress);
            } else {
              userInfo.address = userInfo.address || '';
            }
          } else {
            userInfo.address = userInfo.address || '';
          }
        } catch (_addrErr) {
          userInfo.address = userInfo.address || '';
        }
        
        const normalizedProfile = normalizeUserProfile(userInfo);
        setInitialProfile(normalizedProfile);
        setProfileForm(normalizedProfile);
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

  // Auto-update default address when address list changes
  useEffect(() => {
    const updateDefaultAddress = async () => {
      if (addressRefreshKey === 0) return;
      try {
        const addresses = await getMyAddresses();
        if (Array.isArray(addresses) && addresses.length > 0) {
          const defaultAddress = addresses.find((addr) => addr?.defaultAddress === true);

          if (defaultAddress) {
            const formatted = formatFullAddress(defaultAddress);
            const phoneFromAddress = defaultAddress.recipientPhoneNumber || '';
            setProfileForm((prev) => ({ 
              ...(prev || {}), 
              address: formatted,
              phone: phoneFromAddress || prev?.phone || ''
            }));
            setInitialProfile((prev) => ({ 
              ...(prev || {}), 
              address: formatted,
              phone: phoneFromAddress || prev?.phone || ''
            }));
            setSelectedAddress(defaultAddress);
          } else {
            // No default address, clear if no address selected
            setProfileForm((prev) => {
              const currentSelectedId = selectedAddress?.id || selectedAddress?.addressId || selectedAddress?.address_id;
              const stillExists = addresses.some((addr) => {
                const addrId = addr.id || addr.addressId || addr.address_id;
                return addrId === currentSelectedId;
              });
              if (!stillExists) {
                return { ...(prev || {}), address: '' };
              }
              return prev;
            });
          }
        } else {
          // No addresses at all, clear
          setProfileForm((prev) => ({ ...(prev || {}), address: '' }));
          setInitialProfile((prev) => ({ ...(prev || {}), address: '' }));
          setSelectedAddress(null);
        }
      } catch (_e) {
        // Ignore errors
      }
    };
    updateDefaultAddress();
  }, [addressRefreshKey, selectedAddress]);

  const renderContent = () => {
    if (activeSection === 'password') {
      return (
        <PasswordSection
          passwordForm={passwordForm}
          passwordMessage={passwordMessage}
          onChange={handlePasswordChange}
          onSubmit={handlePasswordSubmit}
          oldPasswordError={oldPasswordError}
          newPasswordError={newPasswordError}
          confirmPasswordError={confirmPasswordError}
          onPasswordFieldChange={handlePasswordFieldChange}
        />
      );
    }

    if (activeSection === 'orders') {
      const searchParams = new URLSearchParams(location.search);
      const tabFromUrl = searchParams.get('tab');
      const defaultTab = tabFromUrl || location.state?.orderTab || 'pending';
      return <OrdersSection getStatusClass={getStatusClass} defaultTab={defaultTab} />;
    }

    if (activeSection === 'complaint') {
      return <ComplaintSection />;
    }

    if (activeSection === 'vouchers') {
      return <VouchersSection />;
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
        phoneError={phoneError}
        onCancelEdit={handleCancelProfileEdit}
        onChange={handleProfileSectionChange}
        onSubmit={handleProfileSubmit}
        onAddressClick={() => setShowAddressList(true)}
        showAddressList={showAddressList}
        onCloseAddressList={() => setShowAddressList(false)}
        onSelectAddress={(address) => {
          if (!address) return;
          const formatted = formatFullAddress(address);
          const phoneFromAddress = address.recipientPhoneNumber || '';
          setProfileForm((prev) => ({ 
            ...(prev || {}), 
            address: formatted,
            phone: phoneFromAddress || prev?.phone || ''
          }));
          setSelectedAddress(address);
          persistDefaultAddress(address);
        }}
        addressRefreshKey={addressRefreshKey}
        setAddressRefreshKey={setAddressRefreshKey}
        selectedAddress={selectedAddress}
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
            onClick={handleLogoutClick}
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className={cx('logoutModalOverlay')} onClick={handleLogoutCancel}>
          <div className={cx('logoutModal')} onClick={(e) => e.stopPropagation()}>
            <h3 className={cx('logoutModalTitle')}>Xác nhận đăng xuất</h3>
            <p className={cx('logoutModalMessage')}>Bạn có chắc chắn muốn đăng xuất không?</p>
            <div className={cx('logoutModalActions')}>
              <button
                type="button"
                className={cx('btn', 'btnSecondary', 'logoutModalBtn')}
                onClick={handleLogoutCancel}
              >
                Hủy
              </button>
              <button
                type="button"
                className={cx('btn', 'btnLogout', 'logoutModalBtn')}
                onClick={handleLogoutConfirm}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
