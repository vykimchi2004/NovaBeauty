package com.nova_beauty.backend.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BannerResponse {

    String id;
    String title;
    String description;
    String imageUrl;
    String linkUrl;
    Boolean status;
    Boolean pendingReview;
    Integer orderIndex;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDate startDate;
    LocalDate endDate;

    // Created by user info
    String createdBy;
    String createdByName;

    // Products info
    List<String> productIds;
    List<String> productNames;

    // Rejection reason
    String rejectionReason;
}
