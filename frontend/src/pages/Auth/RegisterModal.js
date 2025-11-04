import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './AuthLayout.module.scss';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

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
    // Giả lập gửi mã
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      setOtp(['', '', '', '', '', '']);
      setSeconds(60);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }, 1000);
  };

  const handleVerifyCode = async () => {
    const code = otp.join('');
    if (code.length !== 6) return setError('Vui lòng nhập đủ 6 chữ số');
    setLoading(true);
    setError('');
    // Giả lập xác nhận mã
    setTimeout(() => {
      if (code === '123456') {
        setStep(3);
        setLoading(false);
      } else {
        setError('Mã xác nhận không đúng. Hãy thử lại.');
        setLoading(false);
      }
    }, 1000);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!username.trim()) return setError('Vui lòng nhập tên hiển thị');
    if (password.length < 6) return setError('Mật khẩu phải ít nhất 6 ký tự');
    if (password !== confirm) return setError('Mật khẩu xác nhận không khớp');
    if (!agree) return setError('Vui lòng đồng ý điều khoản');

    setError('');
    setLoading(true);
    // Giả lập đăng ký thành công
    setTimeout(() => {
      setLoading(false);
      // Store user data and trigger login
      const userData = { email, username, id: Date.now() };
      localStorage.setItem('user', JSON.stringify(userData));
      window.dispatchEvent(new CustomEvent('userRegistered', { detail: userData }));
      onClose();
    }, 1000);
  };

  const resendCode = () => {
    if (seconds > 0) return;
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtp(['', '', '', '', '', '']);
      setSeconds(60);
      inputsRef.current[0]?.focus();
      alert('Mã xác nhận mới đã được gửi!');
    }, 1000);
  };

  // ======================== GIAO DIỆN ==========================
  const modal = (
    <div className={cx('overlay')} onClick={onClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeBtn')} onClick={onClose}>
          &times;
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
