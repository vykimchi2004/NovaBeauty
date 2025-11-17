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
        return storage.get(STORAGE_KEYS.TOKEN);
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
        if (token) {
            headers.Authorization = `Bearer ${token}`;
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
            
            // Thay thế "Uncategorized error" bằng message rõ ràng hơn
            if (message === 'Uncategorized error' || message.includes('Uncategorized error')) {
                switch (response.status) {
                    case 400:
                        message = 'Dữ liệu đầu vào không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.';
                        break;
                    case 401:
                        message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
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

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body,
                ...options,
            });

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

