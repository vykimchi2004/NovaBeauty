import apiClient from './api';
import { API_ENDPOINTS, STORAGE_KEYS } from './config';
import { storage } from './utils';

/**
 * User Service
 * Handles all user-related API calls
 */

// Get all users (admin only)
export async function getUsers() {
    try {
        return await apiClient.get(API_ENDPOINTS.USERS.GET_ALL);
    } catch (error) {
        console.error('[User Service] getUsers error:', error);
        throw error;
    }
}

// Get my info (authenticated user)
export async function getMyInfo() {
    try {
        const userInfo = await apiClient.get(API_ENDPOINTS.USERS.GET_MY_INFO);
        
        // Lưu user info vào storage
        if (userInfo) {
            storage.set(STORAGE_KEYS.USER, userInfo);
        }
        
        return userInfo;
    } catch (error) {
        console.error('[User Service] getMyInfo error:', error);
        throw error;
    }
}

// Get user by ID
export async function getUserById(userId) {
    try {
        return await apiClient.get(API_ENDPOINTS.USERS.GET_BY_ID(userId));
    } catch (error) {
        console.error('[User Service] getUserById error:', error);
        throw error;
    }
}

// Create user (register)
export async function createUser(userData) {
    try {
        return await apiClient.post(API_ENDPOINTS.USERS.CREATE, userData);
    } catch (error) {
        console.error('[User Service] createUser error:', error);
        throw error;
    }
}

// Create staff (admin only)
export async function createStaff(staffData) {
    try {
        // Đảm bảo isActive = true khi tạo mới (theo use case)
        const dataToSend = {
            ...staffData,
            isActive: true // Luôn true cho tài khoản mới
        };
        console.log('[User Service] createStaff - Sending data:', dataToSend);
        const response = await apiClient.post(API_ENDPOINTS.USERS.CREATE_STAFF, dataToSend);
        console.log('[User Service] createStaff - Response:', response);
        return response;
    } catch (error) {
        console.error('[User Service] createStaff error:', error);
        throw error;
    }
}

// Update user (requires authentication)
export async function updateUser(userId, userData) {
    try {
        return await apiClient.put(API_ENDPOINTS.USERS.UPDATE(userId), userData);
    } catch (error) {
        console.error('[User Service] updateUser error:', error);
        throw error;
    }
}

// Delete user (admin only)
export async function deleteUser(userId) {
    try {
        return await apiClient.delete(API_ENDPOINTS.USERS.DELETE(userId));
    } catch (error) {
        console.error('[User Service] deleteUser error:', error);
        throw error;
    }
}

// Get all roles
export async function getRoles() {
    try {
        return await apiClient.get(API_ENDPOINTS.USERS.ROLES);
    } catch (error) {
        console.error('[User Service] getRoles error:', error);
        throw error;
    }
}

