import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './AuthLayout.module.scss';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { sendVerificationCode, verifyCode, register, login, checkGoogleUser, setPasswordForGoogleUser } from '~/services/auth';
import { getMyInfo } from '~/services/user';
import { STORAGE_KEYS } from '~/services/config';
import { storage, validatePassword } from '~/services/utils';
import NotificationModal from '~/components/Common/NotificationModal/NotificationModal';

const cx = classNames.bind(styles);

// Hàm dịch lỗi sang tiếng Việt và xác định field
const translateError = (errorMessage) => {
  if (!errorMessage) return { message: 'Đăng ký thất bại', field: 'username' };
  
  const lowerMessage = errorMessage.toLowerCase();
  
  // Dịch các lỗi phổ biến
  if (lowerMessage.includes('uncategorized error') || lowerMessage.includes('uncategorized')) {
    return { message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.', field: 'username' };
  }
  if (lowerMessage.includes('user existed') || (lowerMessage.includes('email') && lowerMessage.includes('existed'))) {
    return { message: 'Email này đã được sử dụng', field: 'email' };
  }
  if (lowerMessage.includes('username') && (lowerMessage.includes('invalid') || lowerMessage.includes('at least'))) {
    return { message: 'Tên hiển thị không hợp lệ', field: 'username' };
  }
  if (lowerMessage.includes('password') && lowerMessage.includes('invalid')) {
    return { message: 'Mật khẩu không hợp lệ', field: 'password' };
  }
  if (lowerMessage.includes('email') && (lowerMessage.includes('invalid') || lowerMessage.includes('format'))) {
    return { message: 'Email không đúng định dạng', field: 'email' };
  }
  if (lowerMessage.includes('otp') || (lowerMessage.includes('mã') && lowerMessage.includes('không đúng'))) {
    return { message: 'Mã xác nhận không đúng hoặc đã hết hạn', field: 'otp' };
  }
  if (lowerMessage.includes('failed to send email') || lowerMessage.includes('email send failed')) {
    return { message: 'Không thể gửi email. Vui lòng thử lại sau.', field: 'email' };
  }
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('unauthenticated')) {
    return { message: 'Bạn không có quyền thực hiện thao tác này', field: 'username' };
  }
  
  // Mặc định trả về message gốc nếu không match, nhưng cố gắng dịch nếu có thể
  return { message: errorMessage, field: 'username' };
};

function RegisterModal({ isOpen, onClose, onOpenLogin, onOpenForgot }) {
  const [step, setStep] = useState(1); // 1: nhập email, 2: xác nhận mã, 3: tạo tài khoản
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  // Bước 2: OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);
  const [seconds, setSeconds] = useState(60);
  const [otpError, setOtpError] = useState('');

  // Bước 3: tạo tài khoản
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [agreeError, setAgreeError] = useState('');
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [showGoogleUserPopup, setShowGoogleUserPopup] = useState(false);
  const [verifiedOtp, setVerifiedOtp] = useState('');

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  // Reset toàn bộ state mỗi khi modal được mở lại
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail('');
      setEmailError('');
      setOtpError('');
      setLoading(false);
      setOtp(['', '', '', '', '', '']);
      setSeconds(60);
      setUsername('');
      setPassword('');
      setConfirm('');
      setAgree(false);
      setShowPass1(false);
      setShowPass2(false);
      setUsernameError('');
      setPasswordError('');
      setConfirmPasswordError('');
      setAgreeError('');
      setIsGoogleUser(false);
      setShowGoogleUserPopup(false);
      setVerifiedOtp('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 2 && seconds > 0) {
      const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, seconds]);

  if (!isOpen) return null;

  // ======================== XỬ LÝ CÁC BƯỚC ==========================
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    setIsGoogleUser(false);
    if (!email) {
      setEmailError('Vui lòng nhập email hợp lệ');
      return;
    }
    setLoading(true);
    try {
      // Kiểm tra xem email có phải Google user không
      const isGoogle = await checkGoogleUser(email);
      setIsGoogleUser(isGoogle);
      console.log('[RegisterModal] handleSendEmail - isGoogleUser:', isGoogle);
      
      // Nếu là Google user, hiển thị popup thông báo
      if (isGoogle) {
        setLoading(false);
        setShowGoogleUserPopup(true);
        console.log('[RegisterModal] handleSendEmail - Google user detected, showing popup');
        return; // Dừng lại, không gửi OTP cho đăng ký
      }
      
      // Nếu không phải Google user, tiếp tục flow đăng ký bình thường
      await sendVerificationCode(email, 'register');
      setLoading(false);
      setStep(2);
      setOtp(['', '', '', '', '', '']);
      setSeconds(60);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) {
      setLoading(false);
      const { message } = translateError(err.message);
      setEmailError(message || 'Gửi mã xác nhận thất bại');
    }
  };

  const handleVerifyCode = async () => {
    const code = otp.join('');
    setOtpError('');
    if (code.length !== 6) {
      setOtpError('Vui lòng nhập đủ 6 chữ số');
      return;
    }
    setLoading(true);
    try {
      await verifyCode(email, code);
      // Lưu OTP đã verify để dùng cho setPasswordForGoogleUser
      setVerifiedOtp(code);
      console.log('[RegisterModal] handleVerifyCode - OTP verified, isGoogleUser:', isGoogleUser);
      console.log('[RegisterModal] handleVerifyCode - verifiedOtp saved:', code);
      setStep(3);
    } catch (err) {
      const { message } = translateError(err.message);
      // Kiểm tra nếu lỗi liên quan đến OTP
      const lowerMessage = (err.message || '').toLowerCase();
      if (lowerMessage.includes('otp') || lowerMessage.includes('mã') || lowerMessage.includes('code')) {
        setOtpError(message || 'Mã xác nhận không đúng hoặc đã hết hạn.');
      } else {
        setOtpError(message || 'Mã xác nhận không đúng hoặc đã hết hạn.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setUsernameError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setAgreeError('');

    let hasError = false;

    // Nếu không phải Google user, yêu cầu username
    if (!isGoogleUser && !username.trim()) {
      setUsernameError('Vui lòng nhập tên hiển thị');
      hasError = true;
    }
    
    // Validate password theo quy định backend
    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu');
      hasError = true;
    } else if (!confirm) {
      setConfirmPasswordError('Vui lòng xác nhận mật khẩu');
      hasError = true;
    } else {
      const passwordValidation = validatePassword(password, confirm);
      if (!passwordValidation.isValid) {
        // Nếu lỗi là về khớp mật khẩu, hiển thị ở confirm field
        if (passwordValidation.error.includes('không khớp')) {
          setConfirmPasswordError(passwordValidation.error);
        } else {
          setPasswordError(passwordValidation.error);
        }
        hasError = true;
      }
    }
    
    if (!agree) {
      setAgreeError('Vui lòng đồng ý điều khoản');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      // QUAN TRỌNG: Kiểm tra lại isGoogleUser để đảm bảo không bị reset
      console.log('[RegisterModal] handleRegister - isGoogleUser:', isGoogleUser);
      console.log('[RegisterModal] handleRegister - email:', email);
      console.log('[RegisterModal] handleRegister - verifiedOtp:', verifiedOtp ? 'Có' : 'Không');
      
      if (isGoogleUser) {
        // ===== GOOGLE USER: CHỈ CẬP NHẬT MẬT KHẨU, KHÔNG TẠO TÀI KHOẢN MỚI =====
        // QUAN TRỌNG: User đã tồn tại trong database (đã đăng nhập bằng Google trước đó)
        // CHỈ CẬP NHẬT password cho user hiện có, KHÔNG TẠO TÀI KHOẢN MỚI
        // KHÔNG GỌI register() - chỉ gọi setPasswordForGoogleUser()
        
        if (!verifiedOtp) {
          throw new Error('OTP chưa được xác thực. Vui lòng quay lại bước xác thực OTP.');
        }
        
        console.log('[RegisterModal] GOOGLE USER - Chỉ cập nhật mật khẩu, KHÔNG tạo tài khoản mới');
        
        // 1) CẬP NHẬT password cho user hiện có (KHÔNG TẠO MỚI)
        // Backend sẽ tìm user theo email và UPDATE password
        // Backend KHÔNG tạo user mới, chỉ UPDATE user hiện có
        await setPasswordForGoogleUser(email, verifiedOtp, password);
        
        // 2) Đăng nhập bằng email/password mới
        await login(email, password);
        
        // 3) Lấy thông tin user từ database (user đã tồn tại)
        let userInfo = null;
        try {
          userInfo = await getMyInfo();
          if (userInfo) {
            storage.set(STORAGE_KEYS.USER, userInfo);
          }
        } catch (err) {
          // fallback
          userInfo = { email, fullName: email.split('@')[0] };
          storage.set(STORAGE_KEYS.USER, userInfo);
        }

        // 4) Phát sự kiện và đóng modal
        window.dispatchEvent(new CustomEvent('userRegistered', { detail: userInfo }));
        onClose();
        window.location.reload();
      } else {
        // ===== USER MỚI: TẠO TÀI KHOẢN MỚI =====
        console.log('[RegisterModal] USER MỚI - Tạo tài khoản mới');
        
        // 1) Tạo tài khoản mới trong database
        await register({ email, password, fullName: username });

        // 2) Đăng nhập ngay sau khi đăng ký
        await login(email, password);

        // 3) Lấy thông tin user
        let userInfo = null;
        try {
          userInfo = await getMyInfo();
          if (userInfo) {
            storage.set(STORAGE_KEYS.USER, userInfo);
          }
        } catch (err) {
          // fallback nếu backend chưa có my-info
          userInfo = { email, fullName: username, username };
          storage.set(STORAGE_KEYS.USER, userInfo);
        }

        // 4) Phát sự kiện để UI cập nhật và đóng modal
        window.dispatchEvent(new CustomEvent('userRegistered', { detail: userInfo }));
        onClose();
        // 5) Reload để đồng bộ toàn bộ UI
        window.location.reload();
      }
    } catch (err) {
      // Dịch lỗi và hiển thị ở đúng field
      const { message, field } = translateError(err.message);
      
      if (field === 'email') {
        // Nếu lỗi liên quan đến email, quay lại step 1 để hiển thị ở email field
        setStep(1);
        setEmailError(message);
      } else if (field === 'password') {
        setPasswordError(message);
      } else if (field === 'otp') {
        setStep(2);
        setOtpError(message);
      } else {
        // Lỗi khác (username, uncategorized, etc.) hiển thị ở username field
        setUsernameError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (seconds > 0) return;
    setOtpError('');
    setLoading(true);
    try {
      await sendVerificationCode(email, 'register');
      setOtp(['', '', '', '', '', '']);
      setSeconds(60);
      inputsRef.current[0]?.focus();
    } catch (err) {
      const { message } = translateError(err.message);
      setOtpError(message || 'Gửi lại mã thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ======================== GIAO DIỆN ==========================
  const modal = (
    <div className={cx('overlay')}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeBtn')} onClick={onClose}>
          &times;
        </button>
        <button
          className={cx('backBtn')}
          onClick={() => {
            setEmailError('');
            setOtpError('');
            setUsernameError('');
            setPasswordError('');
            setConfirmPasswordError('');
            setAgreeError('');
            if (step === 1) {
              onOpenLogin?.();
              return;
            }
            if (step === 2) {
              setOtp(['', '', '', '', '', '']);
              setSeconds(60);
            }
            if (step === 3) {
              setPassword('');
              setConfirm('');
              setAgree(false);
              setShowPass1(false);
              setShowPass2(false);
            }
            setStep((s) => Math.max(1, s - 1));
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        

        <h2 className={cx('title')}>Đăng ký</h2>

        {step === 1 && (
          <>
            <p className={cx('subtitle')}>Nhập email của bạn để nhận mã xác nhận.</p>
            <form onSubmit={handleSendEmail} className={cx('form')} noValidate>
              <div className={cx('formGroup')}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                    setIsGoogleUser(false);
                  }}
                  placeholder="Nhập email của bạn"
                />
                {emailError && <div className={cx('error')}>{emailError}</div>}
              </div>
              <button type="submit" className={cx('loginBtn')} disabled={loading}>
                {loading ? 'Đang kiểm tra...' : 'Gửi mã xác nhận'}
              </button>
            </form>
            
            <p className={cx('subtitle')}>
              Đã có tài khoản?{' '}
              <span className={cx('register')} onClick={onOpenLogin}>
                Đăng nhập
              </span>
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <p className={cx('subtitle')}>Nhập mã gồm 6 chữ số đã được gửi tới {email}</p>
            <div className={cx('otpWrapper')}>
              {otp.map((v, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  className={cx('otpItem')}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={v}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (!val) return setOtp((prev) => prev.map((p, idx) => (idx === i ? '' : p)));
                    const newOtp = [...otp];
                    newOtp[i] = val;
                    setOtp(newOtp);
                    if (i < 5 && val) inputsRef.current[i + 1]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0) inputsRef.current[i - 1]?.focus();
                  }}
                />
              ))}
            </div>
            {otpError && <div className={cx('error')} style={{ textAlign: 'center', marginTop: '8px' }}>{otpError}</div>}
            <p className={cx('resend')}>
              {seconds > 0 ? (
                <>Gửi lại mã sau 00:{String(seconds).padStart(2, '0')}</>
              ) : (
                <>
                  Không nhận được mã?{' '}
                  <span className={cx('register')} onClick={resendCode}>
                    Gửi lại
                  </span>
                </>
              )}
            </p>
            <button className={cx('loginBtn')} onClick={handleVerifyCode} disabled={loading}>
              {loading ? 'Đang xác nhận...' : 'Xác nhận mã'}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            {isGoogleUser && (
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
                <strong>Email này đã được đăng nhập bằng Google.</strong><br />
                Bạn có muốn thiết lập mật khẩu để đăng nhập bằng email không?
              </div>
            )}
            <form onSubmit={handleRegister} className={cx('form')} noValidate>
              {!isGoogleUser && (
                <div className={cx('formGroup')}>
                  <label>Tên hiển thị</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tên hiển thị"
                  />
                  {usernameError && <div className={cx('error')}>{usernameError}</div>}
                </div>
              )}

              <div className={cx('formGroup')}>
                <label>Mật khẩu</label>
                <div className={cx('passwordWrapper')}>
                  <input
                    type={showPass1 ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                  />
                  <button type="button" className={cx('eyeBtn')} onClick={() => setShowPass1((prev) => !prev)} tabIndex={-1}>
                    <FontAwesomeIcon icon={showPass1 ? faEyeSlash : faEye} />
                  </button>
                </div>
                {passwordError && <div className={cx('error')}>{passwordError}</div>}
              </div>

              <div className={cx('formGroup')}>
                <label>Xác nhận mật khẩu</label>
                <div className={cx('passwordWrapper')}>
                  <input
                    type={showPass2 ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                  />
                  <button type="button" className={cx('eyeBtn')} onClick={() => setShowPass2((prev) => !prev)} tabIndex={-1}>
                    <FontAwesomeIcon icon={showPass2 ? faEyeSlash : faEye} />
                  </button>
                </div>
                {confirmPasswordError && <div className={cx('error')}>{confirmPasswordError}</div>}
              </div>

              <div>
                <label className={cx('remember_agree')}>
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> Tôi đồng ý với
                  điều khoản
                </label>
                {agreeError && <div className={cx('error')}>{agreeError}</div>}
              </div>

              <button type="submit" className={cx('loginBtn')} disabled={loading}>
                {loading ? (isGoogleUser ? 'Đang thiết lập...' : 'Đang đăng ký...') : (isGoogleUser ? 'Thiết lập mật khẩu' : 'Đăng ký')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {ReactDOM.createPortal(modal, document.getElementById('modal-root'))}
      
      {/* Popup thông báo cho Google user */}
      <NotificationModal
        isOpen={showGoogleUserPopup}
        type="confirm"
        title="Thêm mật khẩu"
        message={`Email "${email}" đã được đăng nhập bằng Google.\n\nBạn có muốn thêm mật khẩu để đăng nhập bằng email không?`}
        confirmText="Thiết lập mật khẩu"
        cancelText="Hủy"
        showCancel={true}
        onConfirm={async () => {
          setShowGoogleUserPopup(false);
          setLoading(true);
          try {
            // QUAN TRỌNG: Đảm bảo isGoogleUser vẫn là true khi chuyển sang step 2
            console.log('[RegisterModal] Popup confirmed - isGoogleUser:', isGoogleUser);
            console.log('[RegisterModal] Popup confirmed - email:', email);
            
            // Gửi OTP với mode 'forgot' để có thể set password
            await sendVerificationCode(email, 'forgot');
            setLoading(false);
            // Đảm bảo isGoogleUser vẫn là true
            setIsGoogleUser(true);
            setStep(2); // Chuyển sang bước nhập OTP
            setOtp(['', '', '', '', '', '']);
            setSeconds(60);
            setTimeout(() => inputsRef.current[0]?.focus(), 100);
          } catch (err) {
            setLoading(false);
            const { message } = translateError(err.message);
            setEmailError(message || 'Gửi mã xác nhận thất bại');
            setShowGoogleUserPopup(false);
          }
        }}
        onClose={() => {
          setShowGoogleUserPopup(false);
          setIsGoogleUser(false);
        }}
      />
    </>
  );
}

export default RegisterModal;


