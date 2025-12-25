package com.nova_beauty.backend.service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.response.NotificationResponse;
import com.nova_beauty.backend.entity.Notification;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.NotificationMapper;
import com.nova_beauty.backend.repository.NotificationRepository;
import com.nova_beauty.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationService {

    NotificationRepository notificationRepository;
    UserRepository userRepository;
    NotificationMapper notificationMapper;

    @Transactional
    public Notification sendToUsers(String title, String message, String type, Set<String> userIds) {
        Set<User> users = new HashSet<>(userRepository.findAllById(userIds));
        Notification n = Notification.builder()
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .users(users)
                .build();
        return notificationRepository.save(n);
    }

    @Transactional
    public Notification sendToRole(String title, String message, String type, String roleName) {
        List<User> targets = userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && u.getRole().getName().equals(roleName))
                .toList();
        Set<String> ids = targets.stream().map(User::getId).collect(Collectors.toSet());
        return sendToUsers(title, message, type, ids);
    }

    // Lấy tất cả notifications của user hiện tại
    public List<NotificationResponse> getMyNotifications(String userId) {
        List<Notification> notifications = notificationRepository.findByUsersIdOrderByCreatedAtDesc(userId);
        return notifications.stream()
                .map(notificationMapper::toResponse)
                .collect(Collectors.toList());
    }

    // Đếm số lượng notifications chưa đọc
    public Long getUnreadCount(String userId) {
        return notificationRepository.countByUsersIdAndIsReadFalse(userId);
    }

    // Đánh dấu một notification đã đọc
    @Transactional
    public void markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_EXISTED));

        // Kiểm tra xem notification có thuộc về user này không
        boolean belongsToUser = notification.getUsers().stream()
                .anyMatch(user -> user.getId().equals(userId));

        if (!belongsToUser) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        notification.setIsRead(true);
        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    // Đánh dấu tất cả notifications của user đã đọc
    @Transactional
    public void markAllAsRead(String userId) {
        List<Notification> notifications = notificationRepository.findByUsersIdOrderByCreatedAtDesc(userId);
        notifications.forEach(notification -> {
            if (!notification.getIsRead()) {
                notification.setIsRead(true);
                notification.setReadAt(LocalDateTime.now());
                notificationRepository.save(notification);
            }
        });
    }
}
