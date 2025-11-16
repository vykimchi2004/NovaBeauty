import apiClient from './api';
import { API_ENDPOINTS } from './config';

/**
 * Banner Service
 * Handles all banner-related API calls
 */

// Get all banners
export async function getBanners() {
    try {
        return await apiClient.get(API_ENDPOINTS.BANNERS.LIST);
    } catch (error) {
        console.error('[Banner Service] getBanners error:', error);
        throw error;
    }
}

// Get active banners
export async function getActiveBanners() {
    try {
        return await apiClient.get(API_ENDPOINTS.BANNERS.ACTIVE);
    } catch (error) {
        console.error('[Banner Service] getActiveBanners error:', error);
        throw error;
    }
}

// Get banner by ID
export async function getBannerById(bannerId) {
    try {
        return await apiClient.get(API_ENDPOINTS.BANNERS.DETAIL(bannerId));
    } catch (error) {
        console.error('[Banner Service] getBannerById error:', error);
        throw error;
    }
}

// Create banner (requires authentication)
export async function createBanner(bannerData) {
    try {
        return await apiClient.post(API_ENDPOINTS.BANNERS.CREATE, bannerData);
    } catch (error) {
        console.error('[Banner Service] createBanner error:', error);
        throw error;
    }
}

// Update banner (requires authentication)
export async function updateBanner(bannerId, bannerData) {
    try {
        return await apiClient.put(API_ENDPOINTS.BANNERS.UPDATE(bannerId), bannerData);
    } catch (error) {
        console.error('[Banner Service] updateBanner error:', error);
        throw error;
    }
}

// Update banner order (requires authentication)
export async function updateBannerOrder(bannerId, orderIndex) {
    try {
        const params = new URLSearchParams({ orderIndex: orderIndex.toString() });
        return await apiClient.put(`${API_ENDPOINTS.BANNERS.UPDATE_ORDER(bannerId)}?${params}`);
    } catch (error) {
        console.error('[Banner Service] updateBannerOrder error:', error);
        throw error;
    }
}

// Delete banner (requires authentication)
export async function deleteBanner(bannerId) {
    try {
        return await apiClient.delete(API_ENDPOINTS.BANNERS.DELETE(bannerId));
    } catch (error) {
        console.error('[Banner Service] deleteBanner error:', error);
        throw error;
    }
}

