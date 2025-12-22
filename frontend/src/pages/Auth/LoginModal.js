import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import styles from './AuthLayout.module.scss';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { login, loginWithGoogle } from '~/services/auth';
import { getMyInfo } from '~/services/user';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';

const cx = classNames.bind(styles);

// Key để lưu email "nhớ tài khoản" (chỉ lưu email, không lưu mật khẩu vì lý do bảo mật)
const REMEMBER_EMAIL_KEY = 'nova_remember_email';

function LoginModal({ isOpen, onClose, onLoginSuccess, onOpenRegister, onOpenForgot }) {
  const navigate = useNavigate?.();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  // Load Google Identity Services script
  useEffect(() => {
    if (!isOpen) return;

    // Kiểm tra xem script đã được load chưa
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      // Script đã có, khởi tạo Google Identity Services
      initializeGoogleSignIn();
      return;
    }

    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initializeGoogleSignIn();
    };
    document.head.appendChild(script);
  }, [isOpen]);

  const initializeGoogleSignIn = () => {
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    
    // Debug: log để kiểm tra biến môi trường và origin
    const currentOrigin = window.location.origin;
    console.log('[Google Sign-In] Client ID:', googleClientId ? 'Found' : 'Missing');
    console.log('[Google Sign-In] Current Origin:', currentOrigin);
    console.log('[Google Sign-In] Please add this origin to Google Cloud Console:', currentOrigin);
    
    if (!googleClientId || googleClientId.trim() === '') {
      console.warn('[Google Sign-In] REACT_APP_GOOGLE_CLIENT_ID is not set. Please check your .env file and restart the server.');
      return;
    }

    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
      });

      // Render Google button vào một div ẩn để có thể trigger click
      const hiddenDiv = document.getElementById('google-signin-hidden');
      if (hiddenDiv) {
        hiddenDiv.innerHTML = '';
        window.google.accounts.id.renderButton(hiddenDiv, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
        });
      }
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    console.log('[Google Sign-In] Full response:', response);
    
    if (!response || !response.credential) {
      console.error('[Google Sign-In] No credential received:', response);
      setPasswordError('Đăng nhập với Google thất bại. Vui lòng thử lại.');
      return;
    }

    try {
      setLoading(true);

      // Log credential để debug
      console.log('[Google Sign-In] Credential received, length:', response.credential.length);
      console.log('[Google Sign-In] Credential preview:', response.credential.substring(0, 50) + '...');

      // Decode ID token để lấy thông tin user (không cần verify vì backend sẽ verify)
      // Chỉ decode để lấy thông tin hiển thị tạm thời
      let userInfo = {
        email: '',
        name: '',
        picture: '',
      };

      try {
        // Kiểm tra xem credential có phải là ID token hợp lệ không (có 3 phần được phân tách bởi dấu chấm)
        const parts = response.credential.split('.');
        console.log('[Google Sign-In] ID token parts count:', parts.length);
        
        if (parts.length !== 3) {
          throw new Error('Invalid ID token format - expected 3 parts, got ' + parts.length);
        }

        // Decode payload (phần thứ 2 của JWT)
        // Base64 URL-safe decode với padding
        let payloadBase64 = parts[1];
        
        // Thay thế URL-safe characters
        payloadBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        
        // Thêm padding nếu cần
        const pad = payloadBase64.length % 4;
        if (pad) {
          if (pad === 1) {
            throw new Error('Invalid base64 string');
          }
          payloadBase64 += new Array(5 - pad).join('=');
        }
        
        // Decode base64 với UTF-8 support
        // atob() decode thành binary string, cần convert sang UTF-8
        const binaryString = atob(payloadBase64);
        // Convert binary string sang UTF-8 string
        const utf8String = decodeURIComponent(
          escape(binaryString)
        );
        const payload = JSON.parse(utf8String);
        console.log('[Google Sign-In] Decoded payload:', payload);
        
        userInfo = {
          email: payload.email || '',
          name: payload.name || '',
          picture: payload.picture || '',
        };
        
        console.log('[Google Sign-In] Extracted user info:', userInfo);
      } catch (decodeError) {
        console.error('[Google Sign-In] Could not decode ID token:', decodeError);
        console.error('[Google Sign-In] Error details:', {
          message: decodeError.message,
          stack: decodeError.stack,
        });
        // Nếu không decode được, vẫn tiếp tục với userInfo rỗng
        // Backend sẽ xử lý dựa trên ID token
      }

      // Backend yêu cầu email không được rỗng
      // Nếu không decode được email, không thể tiếp tục
      if (!userInfo.email || userInfo.email.trim() === '') {
        console.error('[Google Sign-In] Email is required but could not be extracted from ID token');
        setPasswordError('Không thể lấy thông tin email từ Google. Vui lòng thử lại.');
        return;
      }

      // Gọi API login với Google (gửi ID token)
      console.log('[Google Sign-In] Calling loginWithGoogle with:', {
        idToken: response.credential.substring(0, 50) + '...',
        email: userInfo.email,
        name: userInfo.name,
      });
      
      const authResponse = await loginWithGoogle({
        idToken: response.credential,
        email: userInfo.email,
        name: userInfo.name,
        fullName: userInfo.name,
        picture: userInfo.picture,
      });

      if (authResponse && authResponse.token) {
        // Lấy thông tin user từ backend
        let backendUserInfo = null;
        try {
          backendUserInfo = await getMyInfo();
          if (backendUserInfo) {
            storage.set(STORAGE_KEYS.USER, backendUserInfo);
          }
        } catch (err) {
          console.warn('Could not fetch user info:', err);
        }

        // Thông báo thành công
        if (onLoginSuccess) {
          onLoginSuccess(backendUserInfo);
        }

        // Đóng modal
        onClose();

        // Điều hướng theo tài khoản
        const loggedInEmail = (backendUserInfo?.email || userInfo.email || '').toLowerCase();
        const roleName = backendUserInfo?.role?.name?.toUpperCase() || '';

        if (loggedInEmail === 'admin@novabeauty.com' || roleName === 'ADMIN') {
          if (navigate) {
            navigate('/admin', { replace: true });
          } else {
            window.location.href = '/admin';
          }
        } else if (roleName === 'STAFF') {
          if (navigate) {
            navigate('/staff', { replace: true });
          } else {
            window.location.href = '/staff';
          }
        } else if (roleName === 'CUSTOMER_SUPPORT') {
          if (navigate) {
            navigate('/customer-support', { replace: true });
          } else {
            window.location.href = '/customer-support';
          }
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Google login error:', err);
      setPasswordError(err.message || 'Đăng nhập với Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleButtonClick = () => {
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    
    // Debug: log để kiểm tra biến môi trường
    console.log('[Google Sign-In] Button clicked. Client ID:', googleClientId ? 'Found' : 'Missing');
    
    if (!googleClientId || googleClientId.trim() === '') {
      console.error('[Google Sign-In] REACT_APP_GOOGLE_CLIENT_ID is not set. Please check your .env file and restart the server.');
      alert('Google Sign-In chưa được cấu hình. Vui lòng kiểm tra file .env và restart server.');
      return;
    }

    if (window.google && window.google.accounts && window.google.accounts.id) {
      // Tìm Google button đã được render và trigger click vào nó
      const hiddenDiv = document.getElementById('google-signin-hidden');
      if (hiddenDiv) {
        const googleButton = hiddenDiv.querySelector('div[role="button"]');
        if (googleButton) {
          googleButton.click();
          return;
        }
      }

      // Fallback: nếu không tìm thấy button, thử prompt One Tap
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Nếu One Tap không hiển thị, thử render button và click
          const hiddenDiv = document.getElementById('google-signin-hidden');
          if (hiddenDiv && window.google && window.google.accounts && window.google.accounts.id) {
            hiddenDiv.innerHTML = '';
            window.google.accounts.id.renderButton(hiddenDiv, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
            });
            
            // Đợi một chút để button được render, sau đó click
            setTimeout(() => {
              const googleButton = hiddenDiv.querySelector('div[role="button"]');
              if (googleButton) {
                googleButton.click();
              } else {
                setPasswordError('Không thể khởi tạo Google Sign-In. Vui lòng thử lại.');
              }
            }, 100);
          } else {
            setPasswordError('Google Sign-In chưa được tải. Vui lòng thử lại sau.');
          }
        }
      });
    } else {
      alert('Google Sign-In chưa được tải. Vui lòng thử lại sau.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setEmailError('');
      setPasswordError('');
      setLoading(false);
      setShowPassword(false);
      setRenderKey((k) => k + 1);
      
      // Kiểm tra xem có lưu email "nhớ tài khoản" không
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
      setRememberMe(!!savedEmail); // Nếu có email đã lưu thì tích checkbox
      
      setTimeout(() => {
        if (savedEmail) {
          // Nếu có email đã lưu, điền vào form
          if (emailRef.current) emailRef.current.value = savedEmail;
        } else {
          if (emailRef.current) emailRef.current.value = '';
        }
        // Luôn để trống mật khẩu (không lưu mật khẩu)
        if (passwordRef.current) passwordRef.current.value = '';
      }, 0);
    }
  }, [isOpen]);

  const handleClose = () => {
    setEmailError('');
    setPasswordError('');
    setLoading(false);
    setShowPassword(false);
    if (emailRef.current) emailRef.current.value = '';
    if (passwordRef.current) passwordRef.current.value = '';
    onClose?.();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;

    // Reset errors
    setEmailError('');
    setPasswordError('');

    let hasError = false;

    // Validation
    if (!email) {
      setEmailError('Vui lòng nhập email');
      hasError = true;
    } else {
      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError('Email không đúng định dạng');
        hasError = true;
      }
    }

    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      // Gọi API login
      const response = await login(email, password);
      
      if (response && response.token) {
        // Xử lý "nhớ tài khoản" - chỉ lưu email
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
        
        // Lấy thông tin user
        let userInfo = null;
        try {
          userInfo = await getMyInfo();
          if (userInfo) {
            storage.set(STORAGE_KEYS.USER, userInfo);
          }
        } catch (err) {
          console.warn('Could not fetch user info:', err);
        }

        // Thông báo thành công
        if (onLoginSuccess) {
          onLoginSuccess(userInfo);
        }

        // Đóng modal
        onClose();

        // Điều hướng theo tài khoản
        const loggedInEmail = (userInfo?.email || email || '').toLowerCase();
        const roleName = userInfo?.role?.name?.toUpperCase() || '';
        
        if (loggedInEmail === 'admin@novabeauty.com' || roleName === 'ADMIN') {
          if (navigate) {
            navigate('/admin', { replace: true });
          } else {
            window.location.href = '/admin';
          }
        } else if (roleName === 'STAFF') {
          if (navigate) {
            navigate('/staff', { replace: true });
          } else {
            window.location.href = '/staff';
          }
        } else if (roleName === 'CUSTOMER_SUPPORT') {
          if (navigate) {
            navigate('/customer-support', { replace: true });
          } else {
            window.location.href = '/customer-support';
          }
        } else {
          // Refresh page để cập nhật UI cho user thường
          window.location.reload();
        }
      } else {
        setPasswordError('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      // Kiểm tra xem lỗi có liên quan đến mật khẩu không
      const errorMessage = err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.';
      const lowerMessage = errorMessage.toLowerCase();
      
      // Nếu lỗi liên quan đến mật khẩu, hiển thị dưới password field
      if (lowerMessage.includes('mật khẩu') || 
          lowerMessage.includes('password') || 
          lowerMessage.includes('unauthorized') || 
          lowerMessage.includes('unauthenticated') ||
          lowerMessage.includes('invalid credentials') ||
          lowerMessage.includes('sai mật khẩu') ||
          lowerMessage.includes('wrong password')) {
        setPasswordError('Mật khẩu không đúng');
      } else if (lowerMessage.includes('email') || lowerMessage.includes('user not found')) {
        setEmailError(errorMessage);
      } else {
        // Mặc định hiển thị dưới password vì thường lỗi đăng nhập là do mật khẩu sai
        setPasswordError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className={cx('overlay')} onClick={handleClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeBtn')} onClick={handleClose}>
          &times;
        </button>

        <h2 className={cx('title')}>Đăng nhập</h2>
        <p className={cx('subtitle')}>
          Bạn chưa có tài khoản?{' '}
          <span className={cx('register')} onClick={onOpenRegister}>
            Đăng ký
          </span>
        </p>

        <form key={renderKey} onSubmit={handleSubmit} className={cx('form')} noValidate autoComplete="off">
          <div className={cx('formGroup')}>
            <label>Email</label>
            <input 
              ref={emailRef} 
              name="email" 
              type="email" 
              placeholder="Nhập email của bạn" 
              disabled={loading}
              autoComplete="off"
            />
            {emailError && <div className={cx('error')}>{emailError}</div>}
          </div>

          <div className={cx('formGroup')}>
            <label>Mật khẩu</label>
            <div className={cx('passwordWrapper')}>
              <input 
                ref={passwordRef} 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Nhập mật khẩu" 
                disabled={loading}
                autoComplete="new-password"
              />
              <button type="button" className={cx('eyeBtn')} onClick={() => setShowPassword((prev) => !prev)} disabled={loading} tabIndex={-1}>
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {passwordError && <div className={cx('error')}>{passwordError}</div>}
          </div>

          <div className={cx('options')}>
            <label className={cx('remember')}>
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading} 
              /> Nhớ tài khoản
            </label>
            <p className={cx('forgot')}>
              <span onClick={loading ? undefined : onOpenForgot} style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
                Quên mật khẩu?
              </span>
            </p>
          </div>

          <button type="submit" className={cx('loginBtn')} disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {process.env.REACT_APP_GOOGLE_CLIENT_ID && process.env.REACT_APP_GOOGLE_CLIENT_ID.trim() !== '' && (
          <>
            <div className={cx('divider')}>
              <span>Hoặc</span>
            </div>

            {/* Hidden div để render Google button */}
            <div id="google-signin-hidden" style={{ display: 'none' }}></div>

            <div id="google-signin-button" className={cx('googleSignInContainer')}>
              <button
                type="button"
                className={cx('googleBtn')}
                onClick={handleGoogleButtonClick}
                disabled={loading}
              >
                <svg className={cx('googleIcon')} viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Đăng nhập với Google
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.getElementById('modal-root'));
}

export default LoginModal;
