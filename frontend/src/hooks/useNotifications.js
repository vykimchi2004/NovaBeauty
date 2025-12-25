import { useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '~/services/notificationService';

/**
 * Custom hook để polling notifications từ backend
 * @param {number} pollInterval - Thời gian giữa mỗi lần poll (ms), default 10000 (10s)
 * @param {boolean} enabled - Bật/tắt polling, default true
 * @returns {object} - { notifications, unreadCount, markAsRead, markAllAsRead, refetch }
 */
export const useNotifications = (pollInterval = 10000, enabled = true) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);
    const previousUnreadCountRef = useRef(0);

    // Fetch notifications từ backend
    const fetchNotifications = useCallback(async () => {
        if (!enabled) return;

        try {
            setIsLoading(true);
            setError(null);
            
            const [notifs, count] = await Promise.all([
                notificationService.getMyNotifications(),
                notificationService.getUnreadCount(),
            ]);

            setNotifications(notifs || []);
            
            // Nếu có notification mới (unread count tăng), dispatch event để hiển thị toast
            if (count > previousUnreadCountRef.current && previousUnreadCountRef.current !== null) {
                const newNotifications = (notifs || []).filter(n => !n.isRead);
                if (newNotifications.length > 0) {
                    // Dispatch event với notification mới nhất
                    window.dispatchEvent(
                        new CustomEvent('newNotification', {
                            detail: newNotifications[0],
                        })
                    );
                }
            }
            
            previousUnreadCountRef.current = count;
            setUnreadCount(count || 0);
        } catch (err) {
            console.error('[useNotifications] Fetch error:', err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [enabled]);

    // Mark một notification là đã đọc
    const markAsRead = useCallback(async (notificationId) => {
        try {
            await notificationService.markAsRead(notificationId);
            // Refetch để cập nhật state
            await fetchNotifications();
        } catch (err) {
            console.error('[useNotifications] Mark as read error:', err);
            throw err;
        }
    }, [fetchNotifications]);

    // Mark tất cả notifications là đã đọc
    const markAllAsRead = useCallback(async () => {
        try {
            await notificationService.markAllAsRead();
            // Refetch để cập nhật state
            await fetchNotifications();
        } catch (err) {
            console.error('[useNotifications] Mark all as read error:', err);
            throw err;
        }
    }, [fetchNotifications]);

    // Setup polling
    useEffect(() => {
        if (!enabled) {
            // Clear interval nếu disabled
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Initial fetch
        fetchNotifications();

        // Setup interval polling
        intervalRef.current = setInterval(fetchNotifications, pollInterval);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, pollInterval, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        refetch: fetchNotifications,
    };
};

export default useNotifications;
