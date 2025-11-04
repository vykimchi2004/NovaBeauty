import apiClient from './api';
import { API_ENDPOINTS } from './config';

/**
 * Product Service
 * Handles all product-related API calls
 */

// Get all products
export async function getProducts(params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString 
            ? `${API_ENDPOINTS.PRODUCTS.LIST}?${queryString}`
            : API_ENDPOINTS.PRODUCTS.LIST;
        
        return await apiClient.get(endpoint);
    } catch (error) {
        console.error('[Product Service] getProducts error:', error);
        
        // Dev fallback: return mock data if API not ready
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[Product Service] Using mock data (dev mode)');
            return {
                data: [],
                total: 0,
                page: 1,
                limit: 10,
            };
        }
        
        throw error;
    }
}

// Get product by ID
export async function getProductById(id) {
    try {
        return await apiClient.get(API_ENDPOINTS.PRODUCTS.DETAIL(id));
    } catch (error) {
        console.error('[Product Service] getProductById error:', error);
        
        // Dev fallback: return mock data if API not ready
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[Product Service] Using mock data (dev mode)');
            return {
                id: Number(id),
                name: `Sản phẩm ${id}`,
                description: 'Sản phẩm mô tả',
                price: 299000,
                oldPrice: 399000,
                images: [],
                category: null,
            };
        }
        
        throw error;
    }
}

// Search products
export async function searchProducts(query, params = {}) {
    try {
        const searchParams = new URLSearchParams({
            q: query,
            ...params,
        });
        
        return await apiClient.get(`${API_ENDPOINTS.PRODUCTS.SEARCH}?${searchParams}`);
    } catch (error) {
        console.error('[Product Service] searchProducts error:', error);
        
        // Dev fallback
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[Product Service] Using mock data (dev mode)');
            return {
                data: [],
                total: 0,
                query,
            };
        }
        
        throw error;
    }
}

// Get products by category
export async function getProductsByCategory(category, params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString
            ? `${API_ENDPOINTS.PRODUCTS.BY_CATEGORY(category)}?${queryString}`
            : API_ENDPOINTS.PRODUCTS.BY_CATEGORY(category);
        
        return await apiClient.get(endpoint);
    } catch (error) {
        console.error('[Product Service] getProductsByCategory error:', error);
        
        // Dev fallback
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[Product Service] Using mock data (dev mode)');
            return {
                data: [],
                total: 0,
                category,
            };
        }
        
        throw error;
    }
}

