package com.hanoi_metro.backend.dto.response;

import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatMessageResponse {
    String id;
    String message;
    String senderId;
    String senderName;
    String senderEmail;
    String receiverId;
    String receiverName;
    String receiverEmail;
    Boolean isRead;
    LocalDateTime createdAt;
    LocalDateTime readAt;
}


