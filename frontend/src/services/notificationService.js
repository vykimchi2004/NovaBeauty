import api from './api';

const notificationService = {
    // Lấy tất cả notifications của user hiện tại
    getMyNotifications: async () => {
        const response = await api.get('/notifications');
        return response.data.result;
    },

    // Đếm số lượng notifications chưa đọc
    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread-count');
        return response.data.result;
    },

    // Đánh dấu một notification đã đọc
    markAsRead: async (notificationId) => {
        const response = await api.post(`/notifications/${notificationId}/read`);
        return response.data.result;
    },

    // Đánh dấu tất cả notifications đã đọc
    markAllAsRead: async () => {
        const response = await api.post('/notifications/mark-all-read');
        return response.data.result;
    },
};

export default notificationService;
