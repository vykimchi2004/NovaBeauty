package com.nova_beauty.backend.dto.request;

import java.time.LocalDate;
import java.util.List;

import com.nova_beauty.backend.enums.ProductStatus;
import jakarta.validation.constraints.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductUpdateRequest {

    @Size(max = 255, message = "TÃªn sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String name;

    @Size(max = 2000, message = "MÃ´ táº£ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 2000 kÃ½ tá»±")
    String description;

    String size;

    @Size(max = 255, message = "TÃªn tÃ¡c giáº£ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String author;

    @Size(max = 255, message = "TÃªn nhÃ  xuáº¥t báº£n khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String publisher;

    @DecimalMin(value = "0.0", message = "Trá»ng lÆ°á»£ng pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double weight;

    @Min(value = 1, message = "Chiá»u dÃ i pháº£i lá»›n hÆ¡n hoáº·c báº±ng 1")
    Double length;

    @Min(value = 1, message = "Chiá»u rá»™ng pháº£i lá»›n hÆ¡n hoáº·c báº±ng 1")
    Double width;

    @Min(value = 1, message = "Chiá»u cao pháº£i lá»›n hÆ¡n hoáº·c báº±ng 1")
    Double height;

    @DecimalMin(value = "0.0", message = "GiÃ¡ niÃªm yáº¿t (giÃ¡ gá»‘c) pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double unitPrice;

    @DecimalMin(value = "0.0", message = "Thuáº¿ pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double tax;

    @DecimalMin(value = "0.0", message = "GiÃ¡ trá»‹ giáº£m giÃ¡ pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double discountValue;

    LocalDate publicationDate;

    String categoryId;

    // Promotion (optional)
    String promotionId;

    ProductStatus status;

    @Min(value = 0, message = "Sá»‘ lÆ°á»£ng tá»“n kho pháº£i >= 0")
    Integer stockQuantity;

    // Media fields
    List<String> imageUrls;
    List<String> videoUrls;
    String defaultMediaUrl;
}
