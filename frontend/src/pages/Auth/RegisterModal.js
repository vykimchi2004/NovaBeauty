import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './AuthLayout.module.scss';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { sendVerificationCode, verifyCode, register, login } from '~/services/auth';
import { getMyInfo } from '~/services/user';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';

const cx = classNames.bind(styles);

function RegisterModal({ isOpen, onClose, onOpenLogin }) {
  const [step, setStep] = useState(1); // 1: nhập email, 2: xác nhận mã, 3: tạo tài khoản
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Bước 2: OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);
  const [seconds, setSeconds] = useState(60);

  // Bước 3: tạo tài khoản
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  // Reset toàn bộ state mỗi khi modal được mở lại
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail('');
      setError('');
      setLoading(false);
      setOtp(['', '', '', '', '', '']);
      setSeconds(60);
      setUsername('');
      setPassword('');
      setConfirm('');
      setAgree(false);
      setShowPass1(false);
      setShowPass2(false);
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
    if (!email) return setError('Vui lòng nhập email hợp lệ');
    setError('');
    setLoading(true);
    try {
      await sendVerificationCode(email, 'register');
      setLoading(false);
      setStep(2);
      setOtp(['', '', '', '', '', '']);
      setSeconds(60);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Gửi mã xác nhận thất bại');
    }
  };

  const handleVerifyCode = async () => {
    const code = otp.join('');
    if (code.length !== 6) return setError('Vui lòng nhập đủ 6 chữ số');
    setLoading(true);
    setError('');
    try {
      await verifyCode(email, code);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Mã xác nhận không đúng hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim()) return setError('Vui lòng nhập tên hiển thị');
    if (password.length < 6) return setError('Mật khẩu phải ít nhất 6 ký tự');
    if (password !== confirm) return setError('Mật khẩu xác nhận không khớp');
    if (!agree) return setError('Vui lòng đồng ý điều khoản');

    setError('');
    setLoading(true);
    try {
      // 1) Tạo tài khoản
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
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (seconds > 0) return;
    setError('');
    setLoading(true);
    try {
      await sendVerificationCode(email, 'register');
      setOtp(['', '', '', '', '', '']);
      setSeconds(60);
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Gửi lại mã thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ======================== GIAO DIỆN ==========================
  const modal = (
    <div className={cx('overlay')} onClick={onClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeBtn')} onClick={onClose}>
          &times;
        </button>
        <button
          className={cx('backBtn')}
          onClick={() => {
            setError('');
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
            <form onSubmit={handleSendEmail} className={cx('form')}>
              <div className={cx('formGroup')}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  required
                />
              </div>
              {error && <div className={cx('error')}>{error}</div>}
              <button type="submit" className={cx('loginBtn')} disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
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
            {error && <div className={cx('error')}>{error}</div>}
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
            <form onSubmit={handleRegister} className={cx('form')}>
              <div className={cx('formGroup')}>
                <label>Tên hiển thị</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tên hiển thị"
                  required
                />
              </div>

              <div className={cx('formGroup')}>
                <label>Mật khẩu</label>
                <div className={cx('passwordWrapper')}>
                  <input
                    type={showPass1 ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    required
                  />
                  <button type="button" className={cx('eyeBtn')} onClick={() => setShowPass1((prev) => !prev)}>
                    <FontAwesomeIcon icon={showPass1 ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div className={cx('formGroup')}>
                <label>Xác nhận mật khẩu</label>
                <div className={cx('passwordWrapper')}>
                  <input
                    type={showPass2 ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    required
                  />
                  <button type="button" className={cx('eyeBtn')} onClick={() => setShowPass2((prev) => !prev)}>
                    <FontAwesomeIcon icon={showPass2 ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <label className={cx('remember_agree')}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> Tôi đồng ý với
                điều khoản
              </label>

              {error && <div className={cx('error')}>{error}</div>}
              <button type="submit" className={cx('loginBtn')} disabled={loading}>
                {loading ? 'Đang đăng ký...' : 'Đăng ký'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.getElementById('modal-root'));
}

export default RegisterModal;


