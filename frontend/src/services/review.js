import apiClient from './api';
import { API_ENDPOINTS } from './config';
import { getStoredToken } from './utils';

/**
 * Review Service
 * Handles all review-related API calls
 * Giống 100% với NovaBeauty
 */

// Helper to extract result from API response (giống NovaBeauty)
const extractResult = (data, isArray = false) => {
    if (isArray) {
        return Array.isArray(data?.result) ? data.result : Array.isArray(data) ? data : [];
    }
    return data?.result || data || null;
};

// Helper function để tạo request API giống NovaBeauty (không throw error)
async function apiRequest(endpoint, options = {}) {
    const { method = 'GET', body = null, token = null } = options;
    // Get API base URL giống NovaBeauty
    const getApiBaseUrl = () => {
        const envUrl = typeof process !== 'undefined' ? process.env?.REACT_APP_API_BASE_URL : undefined;
        return (envUrl && String(envUrl).trim()) || 'http://localhost:8080/nova_beauty';
    };
    const apiBaseUrl = getApiBaseUrl();
    let tokenToUse = token || getStoredToken('token');

    const headers = {
        'Content-Type': 'application/json',
    };
    if (tokenToUse) {
        headers['Authorization'] = `Bearer ${tokenToUse}`;
    }

    try {
        const fullUrl = `${apiBaseUrl}${endpoint}`;
        console.log(`[Review Service] apiRequest: ${method} ${fullUrl}`, { 
            headers: { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : undefined },
            body: body ? JSON.stringify(body) : null 
        });
        
        const resp = await fetch(fullUrl, {
            method,
            headers,
            ...(body && { body: JSON.stringify(body) }),
        });
        
        console.log(`[Review Service] apiRequest response: ${resp.status} ${resp.statusText}`, { url: fullUrl });

        // Parse response body safely
        let data = {};
        try {
            if (resp.status !== 204 && resp.body) {
                const contentType = resp.headers.get('content-type') || '';
                const text = await resp.text().catch(() => '');

                if (text && text.trim()) {
                    if (contentType.includes('application/json') ||
                        (text.trim().startsWith('{') || text.trim().startsWith('['))) {
                        try {
                            data = JSON.parse(text);
                        } catch (parseError) {
                            data = { message: text, raw: text };
                        }
                    } else {
                        data = { message: text, raw: text };
                    }
                }
            }
        } catch (error) {
            console.warn(`Failed to read response for ${endpoint}:`, error);
            data = {};
        }

        return { ok: resp.ok, status: resp.status, data };
    } catch (error) {
        console.error(`API Error [${method} ${endpoint}]:`, error);
        return { ok: false, status: 0, data: {}, error };
    }
}

// Get all reviews (admin) - GIỐNG 100% LUMINABOOK
export async function getAllReviews(token = null) {
    try {
        // Get token from storage if not provided
        const tokenToUse = token || getStoredToken('token');
        
        // Use apiClient - it will automatically add token from storage via buildHeaders()
        // Only override if token is explicitly provided
        const options = tokenToUse ? {
            headers: { Authorization: `Bearer ${tokenToUse}` }
        } : {};
        
        const response = await apiClient.get(API_ENDPOINTS.REVIEWS.LIST, options);
        
        // Extract result from API response (giống LuminaBook)
        const extractResult = (data, isArray = false) => {
            if (isArray) {
                return Array.isArray(data?.result) ? data.result : Array.isArray(data) ? data : [];
            }
            return data?.result || data || null;
        };
        
        return extractResult(response, true);
    } catch (error) {
        console.error('[Review Service] getAllReviews error:', error);
        throw error;
    }
}

// Get my reviews (authenticated user)
export async function getMyReviews() {
    try {
        return await apiClient.get(API_ENDPOINTS.REVIEWS.MY_REVIEWS);
    } catch (error) {
        console.error('[Review Service] getMyReviews error:', error);
        throw error;
    }
}

// Get reviews by product ID (public)
export async function getReviewsByProduct(productId) {
    try {
        return await apiClient.get(API_ENDPOINTS.REVIEWS.BY_PRODUCT(productId));
    } catch (error) {
        console.error('[Review Service] getReviewsByProduct error:', error);
        throw error;
    }
}

// Get review by ID
export async function getReviewById(reviewId) {
    try {
        return await apiClient.get(API_ENDPOINTS.REVIEWS.DETAIL(reviewId));
    } catch (error) {
        console.error('[Review Service] getReviewById error:', error);
        throw error;
    }
}

// Create review (requires authentication) - GIỐNG 100% NOVABEAUTY
export async function createReview(reviewData, token = null) {
    try {
        // Get token from storage if not provided
        const tokenToUse = token || getStoredToken('token');
        
        // Validate payload before sending
        if (!reviewData.product || !reviewData.product.id) {
            console.error('[Review Service] Invalid payload: missing product.id', reviewData);
            return { 
                ok: false, 
                status: 400, 
                data: { message: 'Thiếu thông tin sản phẩm' } 
            };
        }
        
        if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
            console.error('[Review Service] Invalid payload: invalid rating', reviewData);
            return { 
                ok: false, 
                status: 400, 
                data: { message: 'Đánh giá phải từ 1 đến 5 sao' } 
            };
        }
        
        console.log('[Review Service] createReview called:', { 
            endpoint: API_ENDPOINTS.REVIEWS.CREATE, 
            payload: JSON.stringify(reviewData),
            hasToken: !!tokenToUse 
        });
        
        // Use apiClient - it will automatically add token from storage via buildHeaders()
        // Only override if token is explicitly provided
        const options = tokenToUse ? {
            headers: { Authorization: `Bearer ${tokenToUse}` }
        } : {};
        
        const response = await apiClient.post(API_ENDPOINTS.REVIEWS.CREATE, reviewData, options);
        
        console.log('[Review Service] createReview success:', response);
        return { ok: true, status: 200, data: response };
    } catch (error) {
        console.error('[Review Service] createReview error:', error);
        // Extract status and message from error
        const status = error?.response?.status || error?.status || 500;
        const errorData = error?.response?.data || error?.data || { message: error?.message || 'Không thể tạo đánh giá' };
        return { ok: false, status, data: errorData };
    }
}

// Reply to review (requires authentication - staff/admin) - GIỐNG 100% LUMINABOOK
export async function replyToReview(reviewId, replyData, token = null) {
    try {
        // Get token from storage if not provided
        const tokenToUse = token || getStoredToken('token');
        
        console.log('[Review Service] replyToReview called:', { 
            reviewId, 
            replyData,
            hasToken: !!tokenToUse 
        });
        
        // Use apiClient - it will automatically add token from storage via buildHeaders()
        // Only override if token is explicitly provided
        const options = tokenToUse ? {
            headers: { Authorization: `Bearer ${tokenToUse}` }
        } : {};
        
        const response = await apiClient.post(API_ENDPOINTS.REVIEWS.REPLY(reviewId), replyData, options);
        
        console.log('[Review Service] replyToReview success:', response);
        return { ok: true, status: 200, data: response };
    } catch (error) {
        console.error('[Review Service] replyToReview error:', error);
        // Extract status and message from error - giống LuminaBook
        const status = error?.response?.status || error?.status || 500;
        const errorData = error?.response?.data || error?.data || { message: error?.message || 'Không thể gửi phản hồi' };
        return { ok: false, status, data: errorData };
    }
}

// Delete review (requires authentication)
export async function deleteReview(reviewId) {
    try {
        return await apiClient.delete(API_ENDPOINTS.REVIEWS.DELETE(reviewId));
    } catch (error) {
        console.error('[Review Service] deleteReview error:', error);
        throw error;
    }
}

