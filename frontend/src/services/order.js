import apiClient from './api';

/**
 * Order Service - Quản lý đơn hàng
 * Note: Backend chưa có OrderController, service này sẽ được cập nhật khi có API
 */
const orderService = {
    /**
     * Lấy tất cả orders (placeholder - cần API từ backend)
     */
    async getAllOrders() {
        try {
            // TODO: Replace with actual API endpoint when OrderController is created
            // return await apiClient.get('/api/orders');
            return [];
        } catch (error) {
            console.error('[Order Service] getAllOrders error:', error);
            throw error;
        }
    },

    /**
     * Lấy order theo ID
     */
    async getOrderById(id) {
        try {
            // TODO: Replace with actual API endpoint
            // return await apiClient.get(`/api/orders/${id}`);
            return null;
        } catch (error) {
            console.error('[Order Service] getOrderById error:', error);
            throw error;
        }
    },

    /**
     * Cập nhật trạng thái order
     */
    async updateOrderStatus(orderId, status) {
        try {
            // TODO: Replace with actual API endpoint
            // return await apiClient.patch(`/api/orders/${orderId}/status`, { status });
            return null;
        } catch (error) {
            console.error('[Order Service] updateOrderStatus error:', error);
            throw error;
        }
    },
};

export default orderService;

