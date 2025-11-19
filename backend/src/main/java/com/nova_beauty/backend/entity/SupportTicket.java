package com.nova_beauty.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.nova_beauty.backend.enums.TicketAssignee;
import com.nova_beauty.backend.enums.TicketStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "support_tickets")
public class SupportTicket {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    // Order info submitted by customer
    @Column(name = "order_code", nullable = false)
    String orderCode;

    String customerName;
    String email;
    String phone;

    @Column(columnDefinition = "TEXT")
    String content;

    @Column(columnDefinition = "TEXT")
    String handlerNote; // CS/Admin handling notes

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    TicketStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "assigned_to", nullable = false)
    TicketAssignee assignedTo;

    @Column(name = "handler_id")
    String handlerId; // ID of the CSKH/Admin who is handling this ticket

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt;
}
