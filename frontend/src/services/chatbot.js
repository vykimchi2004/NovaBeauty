import apiClient from './api';

/**
 * Chatbot Service - Gọi API chatbot AI
 */
const chatbotService = {
    /**
     * Gửi message đến chatbot AI
     * @param {string} message - Nội dung tin nhắn
     * @param {string} sessionId - Session ID để duy trì conversation (optional)
     * @returns {Promise<{reply: string, sessionId: string}>}
     */
    async ask(message, sessionId = null) {
        try {
            const payload = {
                message: message,
            };
            if (sessionId) {
                payload.sessionId = sessionId;
            }
            return await apiClient.post('/api/chatbot/ask', payload);
        } catch (error) {
            console.error('[Chatbot Service] ask error:', error);
            throw error;
        }
    },
};

export default chatbotService;


