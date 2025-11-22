import apiClient from './api';
import { API_ENDPOINTS } from './config';

/**
 * Cart Service - Quản lý giỏ hàng
 */
const cartService = {
    /**
     * Lấy giỏ hàng hiện tại của user
     */
    async getCart() {
        try {
            return await apiClient.get(API_ENDPOINTS.CART.GET);
        } catch (error) {
            // Nếu lỗi 401/403 (chưa đăng nhập), trả về empty cart
            if (error.code === 401 || error.code === 403) {
                return {
                    id: null,
                    items: [],
                    subtotal: 0,
                    voucherDiscount: 0,
                    appliedVoucherCode: null,
                    totalAmount: 0
                };
            }
            console.error('[Cart Service] getCart error:', error);
            throw error;
        }
    },

    /**
     * Thêm sản phẩm vào giỏ hàng
     * @param {string} productId - ID sản phẩm
     * @param {number} quantity - Số lượng (mặc định 1)
     * @param {string} colorCode - Mã màu (optional)
     */
    async addItem(productId, quantity = 1, colorCode = null) {
        try {
            console.log('[Cart Service] addItem - productId:', productId, 'quantity:', quantity, 'colorCode:', colorCode);
            const params = new URLSearchParams({
                productId: productId,
                quantity: quantity.toString()
            });
            if (colorCode) {
                params.append('colorCode', colorCode);
            }
            const response = await apiClient.post(`${API_ENDPOINTS.CART.ADD_ITEM}?${params}`, {});
            console.log('[Cart Service] addItem success:', response);
            return response;
        } catch (error) {
            console.error('[Cart Service] addItem error:', error);
            // Cải thiện error message
            if (error.message && error.message.includes('Sản phẩm không tồn tại')) {
                error.message = 'Sản phẩm không tồn tại trong hệ thống. Vui lòng chọn sản phẩm khác.';
            }
            throw error;
        }
    },

    /**
     * Áp dụng voucher
     * @param {string} code - Mã voucher
     */
    async applyVoucher(code) {
        try {
            const params = new URLSearchParams({ code });
            return await apiClient.post(`${API_ENDPOINTS.CART.APPLY_VOUCHER}?${params}`, {});
        } catch (error) {
            console.error('[Cart Service] applyVoucher error:', error);
            throw error;
        }
    },

    /**
     * Lấy số lượng sản phẩm trong giỏ hàng (để hiển thị badge)
     */
    async getCartCount() {
        try {
            const cart = await this.getCart();
            if (!cart || !cart.items) return 0;
            return cart.items.reduce((total, item) => total + (item.quantity || 0), 0);
        } catch (error) {
            console.error('[Cart Service] getCartCount error:', error);
            return 0;
        }
    }
};

export default cartService;

