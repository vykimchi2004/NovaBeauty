package com.hanoi_metro.backend.dto.response;

import java.time.LocalDateTime;

import com.hanoi_metro.backend.enums.TicketAssignee;
import com.hanoi_metro.backend.enums.TicketStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketResponse {
    String id;
    String orderCode;
    String customerName;
    String email;
    String phone;
    String topic;
    String content;
    String csNote; // Ghi chú của CSKH
    String adminNote; // Ghi chú của Admin
    String handlerId;
    String handlerName;
    TicketStatus status;
    TicketAssignee assignedTo;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
