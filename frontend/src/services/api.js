import { API_BASE_URL, STORAGE_KEYS } from './config';

// API Client wrapper
class ApiClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
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

            // Thử lấy từ sessionStorage trước (giống NovaBeauty)
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
        // Không log warning cho public endpoints - đây là bình thường

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

    // GET request
    async get(endpoint, options = {}) {
        const url = this.buildURL(endpoint);
        const headers = this.buildHeaders(options.headers);
        const isCartEndpoint = endpoint.includes('/cart');

        // Extract options without headers to avoid override
        const { headers: _, ...restOptions } = options;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers,
                ...restOptions,
            });

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

        // Log request details để debug (luôn log cho cart và review endpoints)
        if (endpoint.includes('/cart') || endpoint.includes('/reviews')) {
            const token = this.getAuthToken();
            console.log('[API] POST request:', {
                url,
                contentType: headers['Content-Type'],
                hasAuth: !!headers.Authorization,
                authHeader: headers.Authorization ? `${headers.Authorization.substring(0, 30)}...` : 'none',
                tokenFromStorage: token ? `${token.substring(0, 20)}...` : 'none',
                allHeaders: Object.keys(headers),
                endpoint,
            });
        }

        // Extract options without headers to avoid override
        const { headers: _, ...restOptions } = options;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body,
                ...restOptions,
            });

            // Log response status (luôn log cho cart và review endpoints)
            if (endpoint.includes('/cart') || endpoint.includes('/reviews')) {
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

