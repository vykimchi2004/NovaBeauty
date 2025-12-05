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
            return response.result || [];
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
            return response.result;
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

