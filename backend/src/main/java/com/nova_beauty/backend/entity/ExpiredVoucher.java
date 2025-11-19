package com.nova_beauty.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.*;

import com.nova_beauty.backend.enums.DiscountApplyScope;
import com.nova_beauty.backend.enums.DiscountValueType;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "expired_vouchers")
public class ExpiredVoucher {
    @Id
    String id;

    @Column(unique = true, nullable = false)
    String code;

    String name;

    @Enumerated(EnumType.STRING)
    DiscountValueType discountValueType;

    @Enumerated(EnumType.STRING)
    DiscountApplyScope applyScope;

    Double minOrderValue;
    Double maxOrderValue;
    Double discountValue;
    Double maxDiscountValue;

    LocalDate startDate;
    LocalDate expiryDate;

    String imageUrl;
    String description;
    Integer usageLimit;
    Integer usageCount;

    Boolean isActive;

    String status;

    String submittedBy;
    String approvedBy;

    LocalDateTime submittedAt;
    LocalDateTime approvedAt;
    LocalDateTime expiredAt;

    String rejectionReason;
}

