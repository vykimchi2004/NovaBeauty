import apiClient from './api';
import { API_ENDPOINTS, STORAGE_KEYS } from './config';
import { storage } from './utils';

/**
 * Auth Service
 * Handles all authentication-related API calls
 */

// Send OTP to email
export async function sendVerificationCode(email, mode = 'register') {
  try {
    const params = new URLSearchParams({ email, mode });
    const response = await fetch(
      `${apiClient.baseURL}${API_ENDPOINTS.AUTH.SEND_OTP}?${params}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data?.message || 'Failed to send verification code');
    }

    const data = await response.json();
    // Backend trả về ApiResponse format: {code, message, result}
    // Nếu code không phải 200 (success), throw error
    if (data.code && data.code !== 200 && data.code !== 1000) {
      throw new Error(data.message || 'Failed to send verification code');
    }
    return data.result;
  } catch (error) {
    console.error('[Auth Service] sendVerificationCode error:', error);
    throw error;
  }
}

// Verify OTP
export async function verifyCode(email, otp) {
  try {
    return await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
      email,
      otp,
    });
  } catch (error) {
    console.error('[Auth Service] verifyCode error:', error);
    throw error;
  }
}

// Login (authenticate)
export async function login(email, password) {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.TOKEN, {
      email,
      password,
    });

    // Lưu token vào storage
    if (response && response.token) {
      storage.set(STORAGE_KEYS.TOKEN, response.token);
    }

    return response;
  } catch (error) {
    console.error('[Auth Service] login error:', error);
    throw error;
  }
}

// Register (create user)
export async function register(userData) {
  try {
    // Tạo user mới
    const response = await apiClient.post(API_ENDPOINTS.USERS.CREATE, userData);

    // Nếu có token, lưu vào storage
    if (response && response.token) {
      storage.set(STORAGE_KEYS.TOKEN, response.token);
    }

    return response;
  } catch (error) {
    console.error('[Auth Service] register error:', error);
    throw error;
  }
}

// Reset password using OTP
export async function resetPassword(email, otp, newPassword) {
  try {
    return await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      email,
      otp,
      newPassword,
    });
  } catch (error) {
    console.error('[Auth Service] resetPassword error:', error);
    throw error;
  }
}

// Change password (requires authentication)
export async function changePassword(currentPassword, newPassword) {
  try {
    return await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
  } catch (error) {
    console.error('[Auth Service] changePassword error:', error);
    throw error;
  }
}

// Refresh token
export async function refreshToken(refreshTokenValue) {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
      token: refreshTokenValue,
    });

    // Cập nhật token mới
    if (response && response.token) {
      storage.set(STORAGE_KEYS.TOKEN, response.token);
    }

    return response;
  } catch (error) {
    console.error('[Auth Service] refreshToken error:', error);
    throw error;
  }
}

// Logout
export async function logout(token) {
  try {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {
      token: token || storage.get(STORAGE_KEYS.TOKEN),
    });

    // Xóa token và user info
    storage.remove(STORAGE_KEYS.TOKEN);
    storage.remove(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('[Auth Service] logout error:', error);
    // Vẫn xóa token ngay cả khi API call fail
    storage.remove(STORAGE_KEYS.TOKEN);
    storage.remove(STORAGE_KEYS.USER);
    throw error;
  }
}
