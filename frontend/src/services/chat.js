import apiClient from './api';

/**
 * Chat Service - Quản lý chat messages
 */
const chatService = {
    /**
     * Lấy tất cả conversations
     */
    async getConversations() {
        try {
            return await apiClient.get('/chat/conversations');
        } catch (error) {
            console.error('[Chat Service] getConversations error:', error);
            throw error;
        }
    },

    /**
     * Lấy conversation với một partner
     */
    async getConversation(partnerId) {
        try {
            return await apiClient.get(`/chat/conversation/${partnerId}`);
        } catch (error) {
            console.error('[Chat Service] getConversation error:', error);
            throw error;
        }
    },

    /**
     * Gửi tin nhắn
     */
    async sendMessage(receiverId, message) {
        try {
            return await apiClient.post('/chat/send', {
                receiverId,
                message,
            });
        } catch (error) {
            console.error('[Chat Service] sendMessage error:', error);
            throw error;
        }
    },

    /**
     * Đánh dấu đã đọc
     */
    async markAsRead(partnerId) {
        try {
            return await apiClient.post(`/chat/conversation/${partnerId}/read`);
        } catch (error) {
            console.error('[Chat Service] markAsRead error:', error);
            throw error;
        }
    },

    /**
     * Lấy số lượng tin nhắn chưa đọc
     */
    async getUnreadCount() {
        try {
            return await apiClient.get('/chat/unread-count');
        } catch (error) {
            console.error('[Chat Service] getUnreadCount error:', error);
            throw error;
        }
    },

    /**
     * Gửi tin nhắn từ chatbot vào hệ thống chat hỗ trợ (public endpoint)
     */
    async sendMessageFromChatbot(message, senderEmail, senderName = null) {
        try {
            const payload = {
                message: message,
                senderEmail: senderEmail,
            };
            if (senderName) {
                payload.senderName = senderName;
            }
            return await apiClient.post('/chat/chatbot/send', payload);
        } catch (error) {
            console.error('[Chat Service] sendMessageFromChatbot error:', error);
            throw error;
        }
    },

    /**
     * Lấy CSKH đầu tiên (chỉ dành cho customer)
     */
    async getFirstCustomerSupport() {
        try {
            return await apiClient.get('/chat/customer-support');
        } catch (error) {
            console.error('[Chat Service] getFirstCustomerSupport error:', error);
            throw error;
        }
    },
};

export default chatService;

