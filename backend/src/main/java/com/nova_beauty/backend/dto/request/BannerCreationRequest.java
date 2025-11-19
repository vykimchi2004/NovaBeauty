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
public class BannerCreationRequest {

    @NotBlank(message = "TiÃªu Ä‘á» khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Size(max = 255, message = "TiÃªu Ä‘á» khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String title;

    @Size(max = 1000, message = "MÃ´ táº£ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 1000 kÃ½ tá»±")
    String description;

    @NotBlank(message = "URL hÃ¬nh áº£nh khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    String imageUrl;

    String linkUrl;

    @Builder.Default
    Boolean status = true;

    @Min(value = 0, message = "Thá»© tá»± sáº¯p xáº¿p pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Integer orderIndex;

    List<String> productIds;

    LocalDate startDate;

    LocalDate endDate;
}
