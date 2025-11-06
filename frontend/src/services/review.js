import apiClient from './api';
import { API_ENDPOINTS } from './config';

/**
 * Review Service
 * Handles all review-related API calls
 */

// Get all reviews (admin)
export async function getAllReviews() {
    try {
        return await apiClient.get(API_ENDPOINTS.REVIEWS.LIST);
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

// Create review (requires authentication)
export async function createReview(reviewData) {
    try {
        return await apiClient.post(API_ENDPOINTS.REVIEWS.CREATE, reviewData);
    } catch (error) {
        console.error('[Review Service] createReview error:', error);
        throw error;
    }
}

// Reply to review (requires authentication - staff/admin)
export async function replyToReview(reviewId, replyData) {
    try {
        return await apiClient.post(API_ENDPOINTS.REVIEWS.REPLY(reviewId), replyData);
    } catch (error) {
        console.error('[Review Service] replyToReview error:', error);
        throw error;
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

