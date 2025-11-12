import apiClient from './api';
import { API_ENDPOINTS } from './config';

/**
 * Promotion Service
 * Handles all promotion-related API calls
 */

// Get all promotions (public)
export async function getPromotions() {
    try {
        return await apiClient.get(API_ENDPOINTS.PROMOTIONS.LIST);
    } catch (error) {
        console.error('[Promotion Service] getPromotions error:', error);
        throw error;
    }
}

// Get active promotions (public)
export async function getActivePromotions() {
    try {
        return await apiClient.get(API_ENDPOINTS.PROMOTIONS.ACTIVE);
    } catch (error) {
        console.error('[Promotion Service] getActivePromotions error:', error);
        throw error;
    }
}

// Get pending promotions (admin only)
export async function getPendingPromotions() {
    try {
        return await apiClient.get(API_ENDPOINTS.PROMOTIONS.PENDING);
    } catch (error) {
        console.error('[Promotion Service] getPendingPromotions error:', error);
        throw error;
    }
}

// Get promotions by status
export async function getPromotionsByStatus(status) {
    try {
        return await apiClient.get(API_ENDPOINTS.PROMOTIONS.BY_STATUS(status));
    } catch (error) {
        console.error('[Promotion Service] getPromotionsByStatus error:', error);
        throw error;
    }
}

// Get my promotions (staff)
export async function getMyPromotions() {
    try {
        return await apiClient.get(API_ENDPOINTS.PROMOTIONS.MY_PROMOTIONS);
    } catch (error) {
        console.error('[Promotion Service] getMyPromotions error:', error);
        throw error;
    }
}

// Get promotion by ID
export async function getPromotionById(promotionId) {
    try {
        return await apiClient.get(API_ENDPOINTS.PROMOTIONS.DETAIL(promotionId));
    } catch (error) {
        console.error('[Promotion Service] getPromotionById error:', error);
        throw error;
    }
}

// Create promotion (requires authentication - staff)
export async function createPromotion(promotionData) {
    try {
        return await apiClient.post(API_ENDPOINTS.PROMOTIONS.CREATE, promotionData);
    } catch (error) {
        console.error('[Promotion Service] createPromotion error:', error);
        throw error;
    }
}

// Update promotion (requires authentication - staff)
export async function updatePromotion(promotionId, promotionData) {
    try {
        return await apiClient.put(API_ENDPOINTS.PROMOTIONS.UPDATE(promotionId), promotionData);
    } catch (error) {
        console.error('[Promotion Service] updatePromotion error:', error);
        throw error;
    }
}

// Delete promotion (requires authentication - staff)
export async function deletePromotion(promotionId) {
    try {
        return await apiClient.delete(API_ENDPOINTS.PROMOTIONS.DELETE(promotionId));
    } catch (error) {
        console.error('[Promotion Service] deletePromotion error:', error);
        throw error;
    }
}

// Approve promotion (requires authentication - admin)
export async function approvePromotion(approveData) {
    try {
        return await apiClient.post(API_ENDPOINTS.PROMOTIONS.APPROVE, approveData);
    } catch (error) {
        console.error('[Promotion Service] approvePromotion error:', error);
        throw error;
    }
}

