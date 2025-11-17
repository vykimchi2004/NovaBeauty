import apiClient from './api';

/**
 * Financial Service - Báo cáo và thống kê
 */
const financialService = {
    /**
     * Lấy doanh thu theo ngày
     * @param {string} start - Ngày bắt đầu (YYYY-MM-DD)
     * @param {string} end - Ngày kết thúc (YYYY-MM-DD)
     */
    async getRevenueByDay(start, end) {
        try {
            const params = new URLSearchParams({ start, end });
            return await apiClient.get(`/api/financial/revenue/day?${params}`);
        } catch (error) {
            console.error('[Financial Service] getRevenueByDay error:', error);
            throw error;
        }
    },

    /**
     * Lấy doanh thu theo sản phẩm
     * @param {string} start - Ngày bắt đầu (YYYY-MM-DD)
     * @param {string} end - Ngày kết thúc (YYYY-MM-DD)
     */
    async getRevenueByProduct(start, end) {
        try {
            const params = new URLSearchParams({ start, end });
            return await apiClient.get(`/api/financial/revenue/product?${params}`);
        } catch (error) {
            console.error('[Financial Service] getRevenueByProduct error:', error);
            throw error;
        }
    },

    /**
     * Lấy doanh thu theo phương thức thanh toán
     * @param {string} start - Ngày bắt đầu (YYYY-MM-DD)
     * @param {string} end - Ngày kết thúc (YYYY-MM-DD)
     */
    async getRevenueByPayment(start, end) {
        try {
            const params = new URLSearchParams({ start, end });
            return await apiClient.get(`/api/financial/revenue/payment?${params}`);
        } catch (error) {
            console.error('[Financial Service] getRevenueByPayment error:', error);
            throw error;
        }
    },
};

export default financialService;

