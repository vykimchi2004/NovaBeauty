import { safeMessage } from './utils';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export async function sendVerificationCode(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const message = await safeMessage(response);
      throw new Error(message || 'Failed to send verification code');
    }
    return response.json();
  } catch (err) {
    // Dev fallback: simulate success if API not ready
    if (process.env.NODE_ENV !== 'production') {
      /* eslint-disable no-console */
      console.warn('[auth] sendVerificationCode fallback (dev):', err?.message || err);
      /* eslint-enable no-console */
      return new Promise((resolve) => setTimeout(() => resolve({ mock: true }), 500));
    }
    throw err;
  }
}

export async function verifyCode(email, code) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (!response.ok) {
      const message = await safeMessage(response);
      throw new Error(message || 'Invalid or expired verification code');
    }
    return response.json();
  } catch (err) {
    // Dev fallback: accept any 4+ digit code if API not ready
    if (process.env.NODE_ENV !== 'production') {
      /* eslint-disable no-console */
      console.warn('[auth] verifyCode fallback (dev):', err?.message || err);
      /* eslint-enable no-console */
      const ok = typeof code === 'string' ? code.trim().replace(/\D/g, '').length >= 4 : false;
      if (!ok) throw new Error('Mã xác nhận không hợp lệ (mock)');
      return new Promise((resolve) => setTimeout(() => resolve({ mock: true }), 400));
    }
    throw err;
  }
}
