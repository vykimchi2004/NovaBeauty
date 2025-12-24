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
    // Endpoint public, không cần token
    const url = apiClient.buildURL(API_ENDPOINTS.AUTH.VERIFY_OTP);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });
    return await apiClient.handleResponse(response);
  } catch (error) {
    console.error('[Auth Service] verifyCode error:', error);
    throw error;
  }
}

// Login (authenticate)
export async function login(email, password) {
  try {
    // Không dùng apiClient.post() vì nó sẽ tự động thêm token cũ vào header
    // Endpoint login không cần token, và token cũ có thể gây lỗi nếu không hợp lệ
    const url = apiClient.buildURL(API_ENDPOINTS.AUTH.TOKEN);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await apiClient.handleResponse(response);

    // Lưu access token và refresh token vào storage
    if (data && data.token) {
      storage.set(STORAGE_KEYS.TOKEN, data.token);
    }
    if (data && data.refreshToken) {
      storage.set(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    }

    return data;
  } catch (error) {
    console.error('[Auth Service] login error:', error);
    throw error;
  }
}

// Google OAuth login
export async function loginWithGoogle(googleData) {
  try {
    const url = apiClient.buildURL(API_ENDPOINTS.AUTH.GOOGLE);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        idToken: googleData.credential || googleData.idToken,
        email: googleData.email,
        fullName: googleData.name || googleData.fullName,
      }),
    });

    const data = await apiClient.handleResponse(response);

    // Lưu access token và refresh token vào storage
    if (data && data.token) {
      storage.set(STORAGE_KEYS.TOKEN, data.token);
    }
    if (data && data.refreshToken) {
      storage.set(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    }

    return data;
  } catch (error) {
    console.error('[Auth Service] loginWithGoogle error:', error);
    throw error;
  }
}

// Register (create user)
export async function register(userData) {
  try {
    // Không dùng apiClient.post() vì endpoint này là public, không cần token
    const url = apiClient.buildURL(API_ENDPOINTS.USERS.CREATE);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await apiClient.handleResponse(response);

    // Nếu có token, lưu vào storage
    if (data && data.token) {
      storage.set(STORAGE_KEYS.TOKEN, data.token);
    }

    return data;
  } catch (error) {
    console.error('[Auth Service] register error:', error);
    throw error;
  }
}

// Reset password using OTP
export async function resetPassword(email, otp, newPassword) {
  try {
    // Endpoint public, không cần token
    const url = apiClient.buildURL(API_ENDPOINTS.AUTH.RESET_PASSWORD);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    return await apiClient.handleResponse(response);
  } catch (error) {
    console.error('[Auth Service] resetPassword error:', error);
    throw error;
  }
}

// Change password (requires authentication)
export async function changePassword(currentPassword, newPassword) {
  try {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });

    // Backend có thể trả về HTTP 200 nhưng ApiResponse có code 400
    // Cần kiểm tra response để đảm bảo không phải lỗi
    // Nếu response là object và có code, kiểm tra code
    if (response && typeof response === 'object' && 'code' in response) {
      if (response.code !== 200 && response.code !== 201) {
        const error = new Error(response.message || 'Đổi mật khẩu thất bại');
        error.code = response.code;
        error.response = response;
        throw error;
      }
      return response.result || response;
    }

    return response;
  } catch (error) {
    console.error('[Auth Service] changePassword error:', error);
    throw error;
  }
}

// Check if email is Google user
export async function checkGoogleUser(email) {
  try {
    const url = apiClient.buildURL(`${API_ENDPOINTS.AUTH.CHECK_GOOGLE_USER}?email=${encodeURIComponent(email)}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await apiClient.handleResponse(response);
    // apiClient.handleResponse trả về data.result nếu có format {code, message, result}
    // Nếu không có result, trả về data
    const result = data?.result !== undefined ? data.result : data;
    const isGoogle = result === true || result === 'true' || result === 1;
    console.log('[Auth Service] checkGoogleUser - email:', email, 'isGoogle:', isGoogle, 'raw data:', data);
    return isGoogle;
  } catch (error) {
    console.error('[Auth Service] checkGoogleUser error:', error);
    return false;
  }
}

// Set password for Google user (requires OTP)
export async function setPasswordForGoogleUser(email, otp, newPassword) {
  try {
    const url = apiClient.buildURL(API_ENDPOINTS.AUTH.SET_PASSWORD_GOOGLE);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    return await apiClient.handleResponse(response);
  } catch (error) {
    console.error('[Auth Service] setPasswordForGoogleUser error:', error);
    throw error;
  }
}

// Refresh token - dùng refresh token để lấy cặp token mới
export async function refreshToken(refreshTokenValue) {
  try {
    // Nếu không truyền refreshTokenValue, lấy từ storage
    const tokenToUse = refreshTokenValue || storage.get(STORAGE_KEYS.REFRESH_TOKEN);

    if (!tokenToUse) {
      throw new Error('No refresh token available');
    }

    const url = apiClient.buildURL(API_ENDPOINTS.AUTH.REFRESH_TOKEN);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: tokenToUse }),
    });

    const data = await apiClient.handleResponse(response);

    // Cập nhật cả access token và refresh token mới
    if (data && data.token) {
      storage.set(STORAGE_KEYS.TOKEN, data.token);
    }
    if (data && data.refreshToken) {
      storage.set(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    }

    return data;
  } catch (error) {
    console.error('[Auth Service] refreshToken error:', error);
    throw error;
  }
}

// Logout
export async function logout(token) {
  try {
    // Endpoint public, không cần token trong header (token được gửi trong body)
    const url = apiClient.buildURL(API_ENDPOINTS.AUTH.LOGOUT);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token || storage.get(STORAGE_KEYS.TOKEN),
      }),
    });

    await apiClient.handleResponse(response);

    // Xóa tất cả token và user info
    storage.remove(STORAGE_KEYS.TOKEN);
    storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    storage.remove(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('[Auth Service] logout error:', error);
    // Vẫn xóa token ngay cả khi API call fail
    storage.remove(STORAGE_KEYS.TOKEN);
    storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    storage.remove(STORAGE_KEYS.USER);
    throw error;
  }
}
