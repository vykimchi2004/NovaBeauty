import { API_BASE_URL, STORAGE_KEYS, API_ENDPOINTS } from './config';

// API Client wrapper
class ApiClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
        this.isRefreshing = false; // Flag để tránh refresh nhiều lần cùng lúc
    }

    isFormData(payload) {
        return typeof FormData !== 'undefined' && payload instanceof FormData;
    }

    // Get auth token from storage (giống NovaBeauty)
    getAuthToken() {
        try {
            const pick = (val) => {
                if (!val) return null;
                let t = String(val).trim();

                // Loại bỏ dấu ngoặc kép hoặc nháy đơn nếu có
                if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
                    t = t.substring(1, t.length - 1);
                }

                // Nếu value là JSON, parse một lần
                if (t.startsWith('{') || t.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(t);
                        t = typeof parsed === 'string' ? parsed : '';
                    } catch (_) { }
                }
                t = t.trim();
                // Xóa prefix Bearer và khoảng trắng
                if (t.toLowerCase().startsWith('bearer ')) {
                    t = t.slice(7);
                }
                return t.trim() || null;
            };


            const fromSession = pick(sessionStorage.getItem(STORAGE_KEYS.TOKEN));
            if (fromSession) return fromSession;

            // Nếu không có trong sessionStorage, lấy từ localStorage
            return pick(localStorage.getItem(STORAGE_KEYS.TOKEN));
        } catch (error) {
            console.error('[API] Error getting token:', error);
            return null;
        }
    }

    // Build full URL
    buildURL(endpoint) {
        return `${this.baseURL}${endpoint}`;
    }

    // Build headers
    buildHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders,
        };

        // Only add token if not already provided in customHeaders
        if (!headers.Authorization) {
            const token = this.getAuthToken();
            if (token && typeof token === 'string' && token.trim().length > 0) {
                headers.Authorization = `Bearer ${token.trim()}`;
            }
        }

        return headers;
    }

    // Lưu token vào storage
    setToken(token) {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        }
    }

    // Xóa token khỏi storage
    clearToken() {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    }

    // Lấy refresh token từ storage
    getRefreshToken() {
        try {
            return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || 
                   sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        } catch (error) {
            return null;
        }
    }

    // Lưu refresh token vào storage
    setRefreshToken(token) {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
        }
    }

    // Tự động refresh token khi hết hạn
    async tryRefreshToken() {
        if (this.isRefreshing) {
            return false; // Đang refresh rồi, không refresh nữa
        }

        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return false; // Không có refresh token
        }

        this.isRefreshing = true;

        try {
            const url = this.buildURL(API_ENDPOINTS.AUTH.REFRESH_TOKEN);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                const newAccessToken = data?.result?.token || data?.token;
                const newRefreshToken = data?.result?.refreshToken || data?.refreshToken;
                
                if (newAccessToken) {
                    this.setToken(newAccessToken);
                }
                if (newRefreshToken) {
                    this.setRefreshToken(newRefreshToken);
                }
                
                if (newAccessToken) {
                    console.log('[API] Token refreshed successfully');
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('[API] Failed to refresh token:', error);
            return false;
        } finally {
            this.isRefreshing = false;
        }
    }

    // Handle response
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        let data;
        try {
            data = isJson ? await response.json() : await response.text();
        } catch (error) {
            throw new Error('Failed to parse response');
        }

        if (!response.ok) {
            // Backend trả về ApiResponse format: {code, message, result}
            let message = data?.message || data || `HTTP error! status: ${response.status}`;
            
            // Xử lý trường hợp message là object hoặc array
            if (typeof message === 'object') {
                if (Array.isArray(message)) {
                    message = message.join(', ');
                } else if (message.message) {
                    message = message.message;
                } else {
                    message = JSON.stringify(message);
                }
            }
            
            // Log chi tiết cho 401/403 để debug (nhưng không log cho /cart endpoint vì đây là bình thường khi chưa đăng nhập)
            if ((response.status === 401 || response.status === 403) && !response.url.includes('/cart')) {
                console.error('[API] Auth error:', {
                    status: response.status,
                    statusText: response.statusText,
                    message: message,
                    data: data,
                    url: response.url
                });
            }
            
            // Dịch các message tiếng Anh phổ biến sang tiếng Việt
            const messageTranslations = {
                'You do not have permission': 'Bạn không có quyền thực hiện thao tác này.',
                'Access Denied': 'Bạn không có quyền truy cập.',
                'Forbidden': 'Bạn không có quyền thực hiện thao tác này.',
                'Unauthorized': 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại.',
            };
            
            // Kiểm tra và dịch message nếu cần
            for (const [en, vi] of Object.entries(messageTranslations)) {
                if (message && message.includes(en)) {
                    message = vi;
                    break;
                }
            }
            
            // Thay thế "Uncategorized error" hoặc message rỗng bằng message rõ ràng hơn
            if (
                !message ||
                message === '' ||
                message === 'Uncategorized error' ||
                message.includes('Uncategorized error')
            ) {
                switch (response.status) {
                    case 400:
                        message = 'Dữ liệu đầu vào không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.';
                        break;
                    case 401:
                        message = 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại.';
                        break;
                    case 403:
                        message = 'Bạn không có quyền thực hiện thao tác này. Vui lòng kiểm tra lại quyền truy cập của tài khoản.';
                        break;
                    case 404:
                        message = 'Không tìm thấy tài nguyên.';
                        break;
                    case 500:
                        message = 'Lỗi hệ thống. Vui lòng thử lại sau.';
                        break;
                    default:
                        message = `Lỗi ${response.status}: ${response.statusText || 'Đã xảy ra lỗi'}`;
                }
            }
            
            const error = new Error(message);
            error.code = data?.code || response.status;
            error.status = response.status;
            error.response = data;
            throw error;
        }

        // Backend trả về ApiResponse format: {code, message, result}
        // Trả về result để frontend dễ sử dụng
        if (isJson && data && typeof data === 'object' && 'result' in data) {
            return data.result;
        }

        return data;
    }

    // Fetch với tự động refresh token khi 401
    async fetchWithRefresh(url, fetchOptions, endpoint) {
        const response = await fetch(url, fetchOptions);

        // Nếu 401 và không phải endpoint auth, thử refresh token
        if (response.status === 401 && !endpoint.includes('/auth/')) {
            const refreshed = await this.tryRefreshToken();
            if (refreshed) {
                // Cập nhật header với token mới
                const newToken = this.getAuthToken();
                if (newToken) {
                    fetchOptions.headers = {
                        ...fetchOptions.headers,
                        Authorization: `Bearer ${newToken}`,
                    };
                }
                // Thử lại request
                return await fetch(url, fetchOptions);
            }
        }

        return response;
    }

    // GET request
    async get(endpoint, options = {}) {
        const url = this.buildURL(endpoint);
        const headers = this.buildHeaders(options.headers);
        const isCartEndpoint = endpoint.includes('/cart');

        // Extract options without headers to avoid override
        const { headers: _, ...restOptions } = options;

        const fetchOptions = {
            method: 'GET',
            headers,
            ...restOptions,
        };

        try {
            const response = await this.fetchWithRefresh(url, fetchOptions, endpoint);
            return await this.handleResponse(response);
        } catch (error) {
            // Không log error cho 401/403 khi gọi /cart endpoint (bình thường khi chưa đăng nhập)
            if (!isCartEndpoint || (error.status !== 401 && error.status !== 403 && error.code !== 401 && error.code !== 403)) {
                console.error('[API] GET error:', error);
            }
            throw error;
        }
    }

    // POST request
    async post(endpoint, data = {}, options = {}) {
        const url = this.buildURL(endpoint);
        const headers = this.buildHeaders(options.headers);
        const isFormData = this.isFormData(data);
        if (isFormData) {
            delete headers['Content-Type'];
        }

        // Nếu endpoint đã có query params, không gửi body
        const hasQueryParams = url.includes('?');
        const body = hasQueryParams ? undefined : (isFormData ? data : JSON.stringify(data));

        // Extract options without headers to avoid override
        const { headers: _, ...restOptions } = options;

        const fetchOptions = {
            method: 'POST',
            headers,
            body,
            ...restOptions,
        };

        try {
            const response = await this.fetchWithRefresh(url, fetchOptions, endpoint);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('[API] POST error:', error);
            throw error;
        }
    }

    // PUT request
    async put(endpoint, data = {}, options = {}) {
        const url = this.buildURL(endpoint);
        const headers = this.buildHeaders(options.headers);
        const isFormData = this.isFormData(data);
        if (isFormData) {
            delete headers['Content-Type'];
        }
        const body = isFormData ? data : JSON.stringify(data);

        const fetchOptions = {
            method: 'PUT',
            headers,
            body,
        };

        try {
            const response = await this.fetchWithRefresh(url, fetchOptions, endpoint);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('[API] PUT error:', error);
            throw error;
        }
    }

    // PATCH request
    async patch(endpoint, data = {}, options = {}) {
        const url = this.buildURL(endpoint);
        const headers = this.buildHeaders(options.headers);
        const isFormData = this.isFormData(data);
        if (isFormData) {
            delete headers['Content-Type'];
        }
        const body = isFormData ? data : JSON.stringify(data);

        const fetchOptions = {
            method: 'PATCH',
            headers,
            body,
        };

        try {
            const response = await this.fetchWithRefresh(url, fetchOptions, endpoint);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('[API] PATCH error:', error);
            throw error;
        }
    }

    // DELETE request
    async delete(endpoint, options = {}) {
        const url = this.buildURL(endpoint);
        const headers = this.buildHeaders(options.headers);

        const fetchOptions = {
            method: 'DELETE',
            headers,
        };

        try {
            const response = await this.fetchWithRefresh(url, fetchOptions, endpoint);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('[API] DELETE error:', error);
            throw error;
        }
    }
}

// Create and export API client instance
const apiClient = new ApiClient();

export default apiClient;

