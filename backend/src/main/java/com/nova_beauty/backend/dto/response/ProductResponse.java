package com.nova_beauty.backend.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.nova_beauty.backend.enums.ProductStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductResponse {

    String id;
    String name;
    String description;
    String size;
    String author;
    String publisher;
    Double weight;
    Double length;
    Double width;
    Double height;
    Double unitPrice;
    Double price;
    Double tax;
    Double discountValue;
    Integer quantitySold;
    ProductStatus status;
    LocalDate publicationDate;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    // Submitted by user info
    String submittedBy;
    String submittedByName;

    // Approval info
    String approvedBy;
    String approvedByName;
    LocalDateTime approvedAt;
    String rejectionReason;

    // Category info
    String categoryId;
    String categoryName;

    // Promotion info
    String promotionId;
    String promotionName;
    LocalDate promotionStartDate; // NgÃ y báº¯t Ä‘áº§u Ã¡p dá»¥ng promotion
    LocalDate promotionExpiryDate; // NgÃ y káº¿t thÃºc Ã¡p dá»¥ng promotion

    // Media info
    List<String> mediaUrls;
    String defaultMediaUrl;

    // Review info
    Integer reviewCount;
    Double averageRating;

    // Inventory info
    Integer stockQuantity;
}
