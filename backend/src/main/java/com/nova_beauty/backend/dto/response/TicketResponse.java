package com.nova_beauty.backend.dto.response;

import java.time.LocalDateTime;

import com.nova_beauty.backend.enums.TicketAssignee;
import com.nova_beauty.backend.enums.TicketStatus;

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
    String content;
    String handlerNote;
    TicketStatus status;
    TicketAssignee assignedTo;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}


