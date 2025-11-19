package com.nova_beauty.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CategoryResponse {

    String id;
    String name;
    String description;
    Boolean status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    // Parent category info
    String parentId;
    String parentName;

    // Sub-categories
    List<CategoryResponse> subCategories;

    // Product count
    Integer productCount;
}
