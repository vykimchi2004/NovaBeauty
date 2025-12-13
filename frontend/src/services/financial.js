import apiClient from './api';

/**
 * Financial Service - Báo cáo và thống kê
 */
const financialService = {
    /**
     * Lấy doanh thu theo ngày/tuần/tháng
     * @param {string} start - Ngày bắt đầu (YYYY-MM-DD)
     * @param {string} end - Ngày kết thúc (YYYY-MM-DD)
     * @param {string} timeMode - Chế độ thời gian: 'day', 'week', 'month', 'hour'
     */
    async getRevenueByDay(start, end, timeMode = 'day') {
        try {
            const params = new URLSearchParams({ start, end, timeMode });
            return await apiClient.get(`/api/financial/revenue/day?${params}`);
        } catch (error) {
            console.error('[Financial Service] getRevenueByDay error:', error);
            throw error;
        }
    },

    /**
     * Lấy tổng hợp doanh thu (summary)
     * @param {string} start - Ngày bắt đầu (YYYY-MM-DD)
     * @param {string} end - Ngày kết thúc (YYYY-MM-DD)
     */
    async getRevenueSummary(start, end) {
        try {
            const params = new URLSearchParams({ start, end });
            return await apiClient.get(`/api/financial/revenue/summary?${params}`);
        } catch (error) {
            console.error('[Financial Service] getRevenueSummary error:', error);
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
            return await apiClient.get(`/api/financial/top-products?${params}&limit=20`);
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

    /**
     * Lấy thống kê đơn hàng
     * @param {string} start - Ngày bắt đầu (YYYY-MM-DD)
     * @param {string} end - Ngày kết thúc (YYYY-MM-DD)
     */
    async getOrderStatistics(start, end) {
        try {
            const params = new URLSearchParams({ start, end });
            return await apiClient.get(`/orders/statistics?${params}`);
        } catch (error) {
            console.error('[Financial Service] getOrderStatistics error:', error);
            throw error;
        }
    },

    /**
     * Lấy báo cáo tài chính tổng hợp
     * @param {string} start - Ngày bắt đầu (YYYY-MM-DD)
     * @param {string} end - Ngày kết thúc (YYYY-MM-DD)
     */
    async getFinancialSummary(start, end) {
        try {
            const params = new URLSearchParams({ start, end });
            return await apiClient.get(`/api/financial/summary?${params}`);
        } catch (error) {
            console.error('[Financial Service] getFinancialSummary error:', error);
            throw error;
        }
    },
};

export default financialService;

