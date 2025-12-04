import React, { useEffect, useState, useCallback } from 'react';
import classNames from 'classnames/bind';
import { useNavigate } from 'react-router-dom';
import styles from './CustomerSupportNotificationPage.module.scss';
import { useNotification } from '../../../components/Common/Notification';
import ConfirmDialog from '../../../components/Common/ConfirmDialog/DeleteAccountDialog';

const cx = classNames.bind(styles);
const STORAGE_KEY = 'CS_SUPPORT_NOTIFICATIONS';

const formatDateTime = (value) => {
    try {
        return new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    } catch (_) {
        return value || '';
    }
};

const formatRelativeTime = (dateString) => {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return formatDateTime(dateString);
    } catch {
        return formatDateTime(dateString);
    }
};

const loadStoredNotifications = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (_) {
        // ignore
    }
    return [];
};

const persistNotifications = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {
        // ignore storage errors
    }
};

const buildSeedNotifications = () => [
    {
        id: `seed-${Date.now()}`,
        title: 'Chưa có thông báo nào',
        message: 'Bạn sẽ nhận được thông báo khi hệ thống ghi nhận khiếu nại hoặc yêu cầu hoàn tiền.',
        createdAt: new Date().toISOString(),
        isRead: false,
        type: 'info',
    },
];

export default function CustomerSupportNotificationPage() {
    const navigate = useNavigate();
    const { success, error: notifyError } = useNotification();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null,
    });

    const updateNotifications = useCallback((updater) => {
        setNotifications((prev) => {
            const next = updater(prev);
            persistNotifications(next);
            return next;
        });
    }, []);

    const fetchNotifications = useCallback(() => {
        setLoading(true);
        try {
            const stored = loadStoredNotifications();
            if (stored.length > 0) {
                setNotifications(stored);
            } else {
                const seed = buildSeedNotifications();
                setNotifications(seed);
                persistNotifications(seed);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            notifyError('Không thể tải danh sách thông báo');
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [notifyError]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleMarkAsRead = (notificationId) => {
        updateNotifications((prev) =>
            prev.map((notif) =>
                notif.id === notificationId
                    ? { ...notif, isRead: true, readAt: new Date().toISOString() }
                    : notif,
            ),
        );
    };

    // Đánh dấu tất cả là đã đọc
    const handleMarkAllAsRead = () => {
        if (!notifications.length) return;

        setConfirmDialog({
            open: true,
            title: 'Xác nhận đánh dấu đã đọc',
            message: 'Bạn có chắc chắn muốn đánh dấu TẤT CẢ thông báo là đã đọc không?',
            onConfirm: () => {
                setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
                updateNotifications((prev) =>
                    prev.map((notif) => ({
                        ...notif,
                        isRead: true,
                        readAt: new Date().toISOString(),
                    })),
                );
                success('Đã đánh dấu tất cả thông báo là đã đọc');
            },
        });
    };

    const handleDelete = (notificationId) => {
        setConfirmDialog({
            open: true,
            title: 'Xác nhận xóa thông báo',
            message: 'Bạn có chắc chắn muốn xóa thông báo này không?',
            onConfirm: () => {
                setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
                updateNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
                success('Đã xóa thông báo');
            },
        });
    };

    const handleDeleteAllRead = () => {
        const readCount = notifications.filter((n) => n.isRead || n.readAt).length;
        if (readCount === 0) {
            notifyError('Không có thông báo đã đọc để xóa');
            return;
        }

        setConfirmDialog({
            open: true,
            title: 'Xác nhận xóa thông báo đã đọc',
            message: `Bạn có chắc chắn muốn xóa ${readCount} thông báo đã đọc không?`,
            onConfirm: () => {
                setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
                updateNotifications((prev) => prev.filter((notif) => !notif.isRead && !notif.readAt));
                success(`Đã xóa ${readCount} thông báo đã đọc`);
            },
        });
    };

    const unreadCount = notifications.filter((n) => !n.isRead && !n.readAt).length;

    const handleViewDetail = (notification) => {
        if (!notification?.link) return;
        if (!notification.isRead && !notification.readAt) {
            handleMarkAsRead(notification.id);
        }
        navigate(notification.link);
    };

    return (
        <div className={cx('container')}>
            <div className={cx('header')}>
                <h1 className={cx('title')}>
                    Thông báo
                    {unreadCount > 0 && (
                        <span className={cx('badge')}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </h1>
                <div className={cx('actions')}>
                    <button
                        className={cx('btn', 'btn-secondary')}
                        onClick={() => navigate('/customer-support')}
                    >
                        ← Quay lại Dashboard
                    </button>
                    <button
                        className={cx('btn', 'btn-primary')}
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0 || loading}
                    >
                        Đánh dấu tất cả đã đọc
                    </button>
                    <button
                        className={cx('btn', 'btn-danger')}
                        onClick={handleDeleteAllRead}
                        disabled={notifications.filter((n) => n.isRead || n.readAt).length === 0 || loading}
                    >
                        Xóa tất cả đã đọc
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={cx('loading')}>Đang tải thông báo...</div>
            ) : notifications.length === 0 ? (
                <div className={cx('empty')}>
                    <p className={cx('empty-title')}>Không có thông báo nào</p>
                    <p className={cx('empty-desc')}>
                        Các thông báo về khiếu nại từ admin sẽ hiển thị tại đây.
                    </p>
                    <p className={cx('empty-note')}>
                        <small>
                            Bạn sẽ nhận được thông báo khi admin nhận hoặc hoàn thành xử lý khiếu nại.
                        </small>
                    </p>
                </div>
            ) : (
                <div className={cx('notifications-list')}>
                    {notifications.map((notification) => {
                        const isRead = notification.isRead || notification.readAt;
                        const relativeTime = formatRelativeTime(
                            notification.createdAt || notification.created_at,
                        );

                        return (
                            <div
                                key={notification.id}
                                className={cx('notification-item', { read: isRead, unread: !isRead })}
                            >
                                <div className={cx('notification-content')}>
                                    <h3 className={cx('notification-title')}>
                                        {notification.title || 'Thông báo'}
                                    </h3>
                                    <p className={cx('notification-message')}>
                                        {notification.message || notification.content || ''}
                                    </p>
                                    <span className={cx('notification-time')}>{relativeTime}</span>
                                </div>
                                <div className={cx('notification-actions')}>
                                    {notification.link && (
                                        <button
                                            className={cx('btn', 'btn-link')}
                                            onClick={() => handleViewDetail(notification)}
                                        >
                                            Xem chi tiết
                                        </button>
                                    )}
                                    {!isRead && (
                                        <button
                                            className={cx('btn', 'btn-read')}
                                            onClick={() => handleMarkAsRead(notification.id)}
                                        >
                                            Đã đọc
                                        </button>
                                    )}
                                    <button
                                        className={cx('btn', 'btn-delete')}
                                        onClick={() => handleDelete(notification.id)}
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() =>
                    setConfirmDialog({ open: false, title: '', message: '', onConfirm: null })
                }
                confirmText="Xác nhận"
                cancelText="Hủy"
            />
        </div>
    );
}

