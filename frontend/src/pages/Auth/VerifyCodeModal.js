import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './AuthLayout.module.scss';
import classNames from 'classnames/bind';
import { maskEmail } from '~/services/utils';

const cx = classNames.bind(styles);

function VerifyCodeModal({ isOpen, onClose, onSubmit, email, onResend, onBack, initialSeconds = 60 }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const inputRefs = useRef(Array.from({ length: 6 }, () => React.createRef()));

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => (document.body.style.overflow = 'unset');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setDigits(['', '', '', '', '', '']);
    setSecondsLeft(initialSeconds);
  }, [isOpen, initialSeconds]);

  useEffect(() => {
    if (!isOpen) return;
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [isOpen, secondsLeft]);

  if (!isOpen) return null;

  const maskedEmail = maskEmail(email);

  const focusAt = (index) => {
    const ref = inputRefs.current[index];
    ref?.current?.focus();
    ref?.current?.select?.();
  };

  const handleChange = (index, value) => {
    const only = value.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[index] = only;
    setDigits(next);
    if (only && index < 5) focusAt(index + 1);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
        return;
      }
      if (index > 0) focusAt(index - 1);
    }
    if (e.key === 'ArrowLeft' && index > 0) focusAt(index - 1);
    if (e.key === 'ArrowRight' && index < 5) focusAt(index + 1);
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    const last = Math.min(text.length - 1, 5);
    focusAt(last);
  };

  const code = digits.join('');
  const canSubmit = code.length >= 4;
  const fmt = (s) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleSubmit = () => {
    const trimmed = code.trim();
    if (trimmed.length < 4) return; // basic guard
    if (onSubmit) onSubmit(trimmed);
  };

  const handleResend = async () => {
    if (secondsLeft > 0) return;
    try {
      await onResend?.();
      setSecondsLeft(initialSeconds);
    } catch (_) {
      // swallow; UI remain
    }
  };

  const modal = (
    <div className={cx('overlay')} onClick={onClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeBtn')} onClick={onClose}>
          &times;
        </button>

        {onBack && (
          <button className={cx('backBtn')} onClick={onBack}>
            ←
          </button>
        )}

        <h2 className={cx('title')}>Xác nhận mã code</h2>
        <p className={cx('subtitle')}>
          Vui lòng nhập mã xác nhận đã được gửi đến email của bạn {maskedEmail && `(${maskedEmail})`}.
        </p>

        <div className={cx('otp')} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs.current[i]}
              className={cx('otpItem')}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              placeholder=""
            />
          ))}
        </div>

        <button type="button" onClick={handleSubmit} className={cx('loginBtn')} disabled={!canSubmit}>
          Xác nhận
        </button>

        <p className={cx('switch-text')}>
          {secondsLeft === 0 ? (
            <span className={cx('switch-link')} onClick={handleResend}>
              Gửi lại mã
            </span>
          ) : (
            <>Gửi lại mã sau {fmt(secondsLeft)}</>
          )}
        </p>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.getElementById('modal-root'));
}

export default VerifyCodeModal;
