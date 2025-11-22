import { API_BASE_URL, STORAGE_KEYS } from './config';
import { storage } from './utils';

// API Client wrapper
class ApiClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    isFormData(payload) {
        return typeof FormData !== 'undefined' && payload instanceof FormData;
    }

    // Get auth token from storage
    getAuthToken() {
        try {
            // Lấy trực tiếp từ localStorage để tránh JSON.parse có thể gây lỗi
            const rawToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
            if (!rawToken) {
                console.warn('[API] No token found in localStorage');
                return null;
            }

            let token;
            try {
                token = JSON.parse(rawToken);
            } catch (e) {
                // Nếu không parse được, có thể token được lưu dạng string thuần
                token = rawToken;
            }

            // Token có thể là string hoặc object, cần extract string
            if (!token) {
                console.warn('[API] Token is null or empty');
                return null;
            }
            
            // Nếu token là string, trả về trực tiếp (loại bỏ dấu ngoặc kép nếu có)
            if (typeof token === 'string') {
                // Loại bỏ dấu ngoặc kép thừa nếu có
                const cleanToken = token.replace(/^["']|["']$/g, '');
                return cleanToken;
            }
            
            // Nếu token là object, thử extract từ các field phổ biến
            if (typeof token === 'object') {
                const extractedToken = token.accessToken || token.token || token.value || null;
                if (extractedToken) {
                    return typeof extractedToken === 'string' ? extractedToken : String(extractedToken);
                }
                console.warn('[API] Token is object but no valid field found:', Object.keys(token));
                return null;
            }
            
            console.warn('[API] Token has unexpected type:', typeof token);
            return null;
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

        const token = this.getAuthToken();
        if (token && typeof token === 'string' && token.trim().length > 0) {
            headers.Authorization = `Bearer ${token.trim()}`;
        } else if (process.env.NODE_ENV === 'development') {
            console.warn('[API] No valid token found, request will be unauthenticated');
        }

        return headers;
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
            
            // Log chi tiết cho 401/403 để debug
            if (response.status === 401 || response.status === 403) {
                console.error('[API] Auth error:', {
                    status: response.status,
                    statusText: response.statusText,
                    message: message,
                    data: data,
                    url: response.url
                });
            }
            
            // Thay thế "Uncategorized error" bằng message rõ ràng hơn
            if (message === 'Uncategorized error' || message.includes('Uncategorized error') || !message || message === '') {
                switch (response.status) {
                    case 400:
                        message = 'Dữ liệu đầu vào không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.';
                        break;
                    case 401:
                        message = 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại.';
                        break;
                    case 403:
                        message = 'Bạn không có quyền thực hiện thao tác này.';
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

    // GET request
    async get(endpoint, options = {}) {
        const url = this.buildURL(endpoint);
        const headers = this.buildHeaders(options.headers);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers,
                ...options,
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('[API] GET error:', error);
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

        // Log request details để debug (luôn log cho cart endpoints)
        if (endpoint.includes('/cart')) {
            console.log('[API] POST request:', {
                url,
                hasAuth: !!headers.Authorization,
                authHeader: headers.Authorization ? `${headers.Authorization.substring(0, 30)}...` : 'none',
                allHeaders: Object.keys(headers),
            });
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body,
                ...options,
            });

            // Log response status (luôn log cho cart endpoints)
            if (endpoint.includes('/cart')) {
                console.log('[API] POST response:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    url: response.url
                });
            }

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

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers,
                body,
                ...options,
            });

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

        try {
            const response = await fetch(url, {
                method: 'PATCH',
                headers,
                body,
                ...options,
            });

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

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers,
                ...options,
            });

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

