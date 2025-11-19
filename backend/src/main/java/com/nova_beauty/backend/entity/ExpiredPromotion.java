package com.nova_beauty.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "expired_promotions")
public class ExpiredPromotion {
    @Id
    String id;

    String code;

    @Column(name = "name", nullable = false)
    String name;

    String imageUrl;
    String description;

    @Column(name = "discount_value", nullable = false)
    Double discountValue;

    @Column(name = "min_order_value")
    Double minOrderValue;

    @Column(name = "max_discount_value")
    Double maxDiscountValue;

    @Column(name = "start_date", nullable = false)
    LocalDate startDate;

    @Column(name = "expiry_date", nullable = false)
    LocalDate expiryDate;

    @Column(name = "usage_count")
    Integer usageCount;

    @Column(name = "is_active")
    Boolean isActive;

    @Column(name = "status", nullable = false)
    String status;

    String submittedBy;
    String approvedBy;

    @Column(name = "submitted_at")
    LocalDateTime submittedAt;

    @Column(name = "approved_at")
    LocalDateTime approvedAt;

    @Column(name = "expired_at")
    LocalDateTime expiredAt; // Thá»i Ä‘iá»ƒm chuyá»ƒn vÃ o báº£ng háº¿t háº¡n

    @Column(name = "rejection_reason")
    String rejectionReason;
}

