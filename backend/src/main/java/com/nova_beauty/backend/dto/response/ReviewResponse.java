package com.nova_beauty.backend.dto.response;

import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReviewResponse {

    String id;
    String nameDisplay;
    Integer rating;
    String comment;
    String reply;
    LocalDateTime createdAt;
    LocalDateTime replyAt;

    // User info
    String userId;
    String userName;

    // Product info
    String productId;
    String productName;
}
