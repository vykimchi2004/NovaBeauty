package com.hanoi_metro.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatConversationResponse {
    String partnerId;
    String partnerName;
    String partnerEmail;
    String lastMessage;
    LocalDateTime lastMessageTime;
    Long unreadCount;
    List<ChatMessageResponse> messages;
}


