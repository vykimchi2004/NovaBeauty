package com.nova_beauty.backend.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import com.nova_beauty.backend.enums.PromotionStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PromotionResponse {

    String id;
    String name;
    String code;
    String imageUrl;
    String description;
    Double discountValue;
    Double minOrderValue;
    Double maxDiscountValue;
    LocalDate startDate;
    LocalDate expiryDate;
    Integer usageCount;
    Integer usageLimit;
    Boolean isActive;
    PromotionStatus status;

    // Approval workflow info
    String submittedBy;
    String approvedBy;
    LocalDateTime submittedAt;
    LocalDateTime approvedAt;
    String rejectionReason;

    // Application scope
    Set<String> categoryIds;
    Set<String> productIds;
}
