package com.nova_beauty.backend.dto.request;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductCreationRequest {
    @NotBlank(message = "MÃ£ sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    String id;

    @NotBlank(message = "TÃªn sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Size(max = 255, message = "TÃªn sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String name;

    @Size(max = 2000, message = "MÃ´ táº£ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 2000 kÃ½ tá»±")
    String description;

    @NotBlank(message = "TÃ¡c giáº£ khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Size(max = 255, message = "TÃªn tÃ¡c giáº£ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String author;

    @NotBlank(message = "NhÃ  xuáº¥t báº£n khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Size(max = 255, message = "TÃªn nhÃ  xuáº¥t báº£n khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String publisher;

    // Optional fields - validation only applies if value is provided (not null)
    @DecimalMin(value = "0.0", message = "Trá»ng lÆ°á»£ng pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double weight;

    @DecimalMin(value = "0.0", message = "Chiá»u dÃ i pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double length;

    @DecimalMin(value = "0.0", message = "Chiá»u rá»™ng pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double width;

    @DecimalMin(value = "0.0", message = "Chiá»u cao pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double height;

    @NotNull(message = "GiÃ¡ niÃªm yáº¿t (giÃ¡ gá»‘c) khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @DecimalMin(value = "0.0", message = "GiÃ¡ niÃªm yáº¿t pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double unitPrice;

    @DecimalMin(value = "0.0", message = "Thuáº¿ pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double tax;

    @DecimalMin(value = "0.0", message = "GiÃ¡ trá»‹ giáº£m giÃ¡ pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double discountValue;

    @NotNull(message = "NgÃ y xuáº¥t báº£n khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    LocalDate publicationDate;

    @NotBlank(message = "Danh má»¥c khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    String categoryId;

    // Promotion (optional)
    String promotionId;

    // Media fields
    List<String> imageUrls;
    List<String> videoUrls;
    String defaultMediaUrl;
}
