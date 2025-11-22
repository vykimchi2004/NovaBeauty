import apiClient from './api';
import { API_ENDPOINTS } from './config';

/**
 * Voucher Service
 * Handles all voucher-related API calls
 */

// Get active vouchers (public)
export async function getActiveVouchers() {
    try {
        return await apiClient.get(API_ENDPOINTS.VOUCHERS.ACTIVE);
    } catch (error) {
        console.error('[Voucher Service] getActiveVouchers error:', error);
        throw error;
    }
}

// Get all vouchers
export async function getVouchers() {
    try {
        return await apiClient.get(API_ENDPOINTS.VOUCHERS.LIST);
    } catch (error) {
        console.error('[Voucher Service] getVouchers error:', error);
        throw error;
    }
}

// Get pending vouchers (admin only)
export async function getPendingVouchers() {
    try {
        return await apiClient.get(API_ENDPOINTS.VOUCHERS.PENDING);
    } catch (error) {
        console.error('[Voucher Service] getPendingVouchers error:', error);
        throw error;
    }
}

// Get vouchers by status
export async function getVouchersByStatus(status) {
    try {
        return await apiClient.get(API_ENDPOINTS.VOUCHERS.BY_STATUS(status));
    } catch (error) {
        console.error('[Voucher Service] getVouchersByStatus error:', error);
        throw error;
    }
}

// Get my vouchers (staff)
export async function getMyVouchers() {
    try {
        return await apiClient.get(API_ENDPOINTS.VOUCHERS.MY_VOUCHERS);
    } catch (error) {
        console.error('[Voucher Service] getMyVouchers error:', error);
        throw error;
    }
}

// Get voucher by ID
export async function getVoucherById(voucherId) {
    try {
        return await apiClient.get(API_ENDPOINTS.VOUCHERS.DETAIL(voucherId));
    } catch (error) {
        console.error('[Voucher Service] getVoucherById error:', error);
        throw error;
    }
}

// Create voucher (requires authentication - staff)
export async function createVoucher(voucherData) {
    try {
        return await apiClient.post(API_ENDPOINTS.VOUCHERS.CREATE, voucherData);
    } catch (error) {
        console.error('[Voucher Service] createVoucher error:', error);
        throw error;
    }
}

// Update voucher (requires authentication - staff)
export async function updateVoucher(voucherId, voucherData) {
    try {
        return await apiClient.put(API_ENDPOINTS.VOUCHERS.UPDATE(voucherId), voucherData);
    } catch (error) {
        console.error('[Voucher Service] updateVoucher error:', error);
        throw error;
    }
}

// Delete voucher (requires authentication - staff)
export async function deleteVoucher(voucherId) {
    try {
        return await apiClient.delete(API_ENDPOINTS.VOUCHERS.DELETE(voucherId));
    } catch (error) {
        console.error('[Voucher Service] deleteVoucher error:', error);
        throw error;
    }
}

// Approve voucher (requires authentication - admin)
export async function approveVoucher(approveData) {
    try {
        return await apiClient.post(API_ENDPOINTS.VOUCHERS.APPROVE, approveData);
    } catch (error) {
        console.error('[Voucher Service] approveVoucher error:', error);
        throw error;
    }
}

