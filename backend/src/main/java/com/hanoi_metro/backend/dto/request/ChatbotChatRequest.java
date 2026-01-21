package com.hanoi_metro.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatbotChatRequest {
    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    String message;

    @NotBlank(message = "Email người gửi không được để trống")
    String senderEmail;

    String senderName; // Optional
}

