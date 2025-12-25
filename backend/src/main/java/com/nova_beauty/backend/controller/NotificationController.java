package com.nova_beauty.backend.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.response.NotificationResponse;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.repository.UserRepository;
import com.nova_beauty.backend.service.NotificationService;
import com.nova_beauty.backend.util.SecurityUtil;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class NotificationController {

    NotificationService notificationService;
    UserRepository userRepository;

    private String getCurrentUserId() {
        String email = SecurityUtil.getCurrentUserEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return user.getId();
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<NotificationResponse>> getMyNotifications() {
        String currentUserId = getCurrentUserId();
        log.info("Getting notifications for user: {}", currentUserId);
        List<NotificationResponse> notifications = notificationService.getMyNotifications(currentUserId);
        return ApiResponse.<List<NotificationResponse>>builder().result(notifications).build();
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Long> getUnreadCount() {
        String currentUserId = getCurrentUserId();
        Long count = notificationService.getUnreadCount(currentUserId);
        return ApiResponse.<Long>builder().result(count).build();
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<String> markAsRead(@PathVariable String id) {
        String currentUserId = getCurrentUserId();
        log.info("Marking notification {} as read for user: {}", id, currentUserId);
        notificationService.markAsRead(id, currentUserId);
        return ApiResponse.<String>builder().result("Đã đánh dấu đã đọc").build();
    }

    @PostMapping("/mark-all-read")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<String> markAllAsRead() {
        String currentUserId = getCurrentUserId();
        log.info("Marking all notifications as read for user: {}", currentUserId);
        notificationService.markAllAsRead(currentUserId);
        return ApiResponse.<String>builder().result("Đã đánh dấu tất cả đã đọc").build();
    }
}
