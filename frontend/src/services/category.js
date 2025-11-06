import apiClient from './api';
import { API_ENDPOINTS } from './config';

/**
 * Category Service
 * Handles all category-related API calls
 */

// Get all categories
export async function getCategories() {
    try {
        return await apiClient.get(API_ENDPOINTS.CATEGORIES.LIST);
    } catch (error) {
        console.error('[Category Service] getCategories error:', error);
        throw error;
    }
}

// Get active categories
export async function getActiveCategories() {
    try {
        return await apiClient.get(API_ENDPOINTS.CATEGORIES.ACTIVE);
    } catch (error) {
        console.error('[Category Service] getActiveCategories error:', error);
        throw error;
    }
}

// Get root categories (categories without parent)
export async function getRootCategories() {
    try {
        return await apiClient.get(API_ENDPOINTS.CATEGORIES.ROOT);
    } catch (error) {
        console.error('[Category Service] getRootCategories error:', error);
        throw error;
    }
}

// Get subcategories by parent ID
export async function getSubCategories(parentId) {
    try {
        return await apiClient.get(API_ENDPOINTS.CATEGORIES.SUB_CATEGORIES(parentId));
    } catch (error) {
        console.error('[Category Service] getSubCategories error:', error);
        throw error;
    }
}

// Get category by ID
export async function getCategoryById(categoryId) {
    try {
        return await apiClient.get(API_ENDPOINTS.CATEGORIES.DETAIL(categoryId));
    } catch (error) {
        console.error('[Category Service] getCategoryById error:', error);
        throw error;
    }
}

// Create category (requires authentication)
export async function createCategory(categoryData) {
    try {
        return await apiClient.post(API_ENDPOINTS.CATEGORIES.CREATE, categoryData);
    } catch (error) {
        console.error('[Category Service] createCategory error:', error);
        throw error;
    }
}

// Update category (requires authentication)
export async function updateCategory(categoryId, categoryData) {
    try {
        return await apiClient.put(API_ENDPOINTS.CATEGORIES.UPDATE(categoryId), categoryData);
    } catch (error) {
        console.error('[Category Service] updateCategory error:', error);
        throw error;
    }
}

// Delete category (requires authentication)
export async function deleteCategory(categoryId) {
    try {
        return await apiClient.delete(API_ENDPOINTS.CATEGORIES.DELETE(categoryId));
    } catch (error) {
        console.error('[Category Service] deleteCategory error:', error);
        throw error;
    }
}

