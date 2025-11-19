package com.nova_beauty.backend.dto.response;

import java.time.LocalDateTime;
import java.util.Set;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationResponse {

    String id;
    String title;
    String message;
    String type;
    Boolean isRead;
    LocalDateTime createdAt;
    LocalDateTime readAt;

    // User info
    Set<String> userIds;
    Set<String> userNames;
}
