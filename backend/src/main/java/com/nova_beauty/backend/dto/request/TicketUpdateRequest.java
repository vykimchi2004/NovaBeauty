package com.nova_beauty.backend.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketUpdateRequest {
    String csNote; // Ghi chú của CSKH
    String adminNote; // Ghi chú của Admin
    String status;
    String assignedTo;
}
