import apiClient from './api';

/**
 * Order Service - Quản lý đơn hàng
 */
const orderService = {
    /**
     * Tạo đơn hàng từ giỏ hàng hiện tại
     * @param {Object} request - CreateOrderRequest
     * @param {string} request.shippingAddress - JSON string của địa chỉ giao hàng
     * @param {string} request.addressId - ID của địa chỉ đã lưu (optional)
     * @param {string} request.note - Ghi chú đơn hàng (optional)
     * @param {number} request.shippingFee - Phí vận chuyển (VND)
     * @param {string[]} request.cartItemIds - Danh sách ID các cart item được chọn
     * @param {string} request.paymentMethod - Phương thức thanh toán ('momo' | 'cod')
     * @returns {Promise<Object>} CheckoutInitResponse với order và payUrl
     */
    async createOrder(request) {
        try {
            // apiClient.post đã trả về data.result rồi, nên response đã là CheckoutInitResponse
            const response = await apiClient.post('/orders/checkout', request);
            console.log('[Order Service] createOrder response:', response);
            return response;
        } catch (error) {
            console.error('[Order Service] createOrder error:', error);
            throw error;
        }
    },

    /**
     * Lấy tất cả orders của khách hàng hiện tại
     */
    async getMyOrders() {
        try {
            const response = await apiClient.get('/orders/my-orders');
            // apiClient.get đã trả về data.result nếu backend có wrapper; nếu không, response là mảng
            if (Array.isArray(response)) return response;
            if (response && typeof response === 'object' && 'result' in response) {
                return response.result || [];
            }
            return [];
        } catch (error) {
            console.error('[Order Service] getMyOrders error:', error);
            throw error;
        }
    },

    /**
     * Lấy order theo ID
     */
    async getOrderById(id) {
        try {
            const response = await apiClient.get(`/orders/${id}`);
            // apiClient.get trả về data.result nếu có wrapper
            if (response && typeof response === 'object' && 'result' in response) {
                return response.result;
            }
            return response;
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

    /**
     * Lấy tất cả orders (cho Staff/Admin)
     */
    async getAllOrders() {
        try {
            const response = await apiClient.get('/orders');
            if (Array.isArray(response)) return response;
            if (response && typeof response === 'object' && 'result' in response) {
                return response.result || [];
            }
            return [];
        } catch (error) {
            console.error('[Order Service] getAllOrders error:', error);
            throw error;
        }
    },

    /**
     * Xác nhận đơn hàng (Staff)
     */
    async confirmOrder(orderId) {
        try {
            const response = await apiClient.post(`/orders/${orderId}/confirm`);
            return { ok: true, data: response };
        } catch (error) {
            console.error('[Order Service] confirmOrder error:', error);
            return { ok: false, status: error.status || 500, data: null };
        }
    },

    /**
     * Hủy đơn hàng (Staff)
     */
    async cancelOrder(orderId, reason = '') {
        try {
            const response = await apiClient.post(`/orders/${orderId}/cancel`, { reason });
            return { ok: true, data: response };
        } catch (error) {
            console.error('[Order Service] cancelOrder error:', error);
            return { ok: false, status: error.status || 500, data: null };
        }
    },

    /**
     * Tạo vận đơn GHN (Staff)
     */
    async createShipment(orderId, payload = null) {
        try {
            const response = await apiClient.post(`/shipments/create/${orderId}`, payload || {});
            return { ok: true, status: 200, data: response };
        } catch (error) {
            console.error('[Order Service] createShipment error:', error);
            return { ok: false, status: error.status || 500, data: null };
        }
    },
};

export default orderService;

