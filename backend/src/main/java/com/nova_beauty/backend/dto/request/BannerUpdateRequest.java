package com.nova_beauty.backend.dto.request;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BannerUpdateRequest {

    @Size(max = 255, message = "TiÃªu Ä‘á» khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String title;

    @Size(max = 1000, message = "MÃ´ táº£ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 1000 kÃ½ tá»±")
    String description;

    String imageUrl;
    String linkUrl;
    Boolean status;
    
    @Size(max = 2000, message = "LÃ½ do tá»« chá»‘i khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 2000 kÃ½ tá»±")
    String rejectionReason;

    @Min(value = 0, message = "Thá»© tá»± sáº¯p xáº¿p pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Integer orderIndex;

    List<String> productIds;

    LocalDate startDate;

    LocalDate endDate;
}
