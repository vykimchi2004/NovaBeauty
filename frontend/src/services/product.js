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
        throw error;
    }
}

// Get product by ID
export async function getProductById(id) {
    try {
        return await apiClient.get(API_ENDPOINTS.PRODUCTS.DETAIL(id));
    } catch (error) {
        console.error('[Product Service] getProductById error:', error);
        throw error;
    }
}

// Search products
export async function searchProducts(keyword, params = {}) {
    try {
        const searchParams = new URLSearchParams({
            keyword,
            ...params,
        });
        
        return await apiClient.get(`${API_ENDPOINTS.PRODUCTS.SEARCH}?${searchParams}`);
    } catch (error) {
        console.error('[Product Service] searchProducts error:', error);
        throw error;
    }
}

// Get products by category
export async function getProductsByCategory(categoryId, params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString
            ? `${API_ENDPOINTS.PRODUCTS.BY_CATEGORY(categoryId)}?${queryString}`
            : API_ENDPOINTS.PRODUCTS.BY_CATEGORY(categoryId);
        
        return await apiClient.get(endpoint);
    } catch (error) {
        console.error('[Product Service] getProductsByCategory error:', error);
        throw error;
    }
}

// Get active products
export async function getActiveProducts() {
    try {
        return await apiClient.get(API_ENDPOINTS.PRODUCTS.ACTIVE);
    } catch (error) {
        console.error('[Product Service] getActiveProducts error:', error);
        throw error;
    }
}

// Get products by price range
export async function getProductsByPriceRange(minPrice, maxPrice) {
    try {
        const params = new URLSearchParams({
            minPrice: minPrice.toString(),
            maxPrice: maxPrice.toString(),
        });
        return await apiClient.get(`${API_ENDPOINTS.PRODUCTS.BY_PRICE_RANGE}?${params}`);
    } catch (error) {
        console.error('[Product Service] getProductsByPriceRange error:', error);
        throw error;
    }
}

// Get my products (for authenticated users)
export async function getMyProducts() {
    try {
        return await apiClient.get(API_ENDPOINTS.PRODUCTS.MY_PRODUCTS);
    } catch (error) {
        console.error('[Product Service] getMyProducts error:', error);
        throw error;
    }
}

// Create product (requires authentication)
export async function createProduct(productData) {
    try {
        return await apiClient.post(API_ENDPOINTS.PRODUCTS.CREATE, productData);
    } catch (error) {
        console.error('[Product Service] createProduct error:', error);
        throw error;
    }
}

// Update product (requires authentication)
export async function updateProduct(productId, productData) {
    try {
        return await apiClient.put(API_ENDPOINTS.PRODUCTS.UPDATE(productId), productData);
    } catch (error) {
        console.error('[Product Service] updateProduct error:', error);
        throw error;
    }
}

// Delete product (requires authentication)
export async function deleteProduct(productId) {
    try {
        return await apiClient.delete(API_ENDPOINTS.PRODUCTS.DELETE(productId));
    } catch (error) {
        console.error('[Product Service] deleteProduct error:', error);
        throw error;
    }
}

