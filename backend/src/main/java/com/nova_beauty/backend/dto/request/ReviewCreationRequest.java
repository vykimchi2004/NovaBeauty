package com.nova_beauty.backend.dto.request;

import jakarta.validation.constraints.*;

import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.User;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReviewCreationRequest {

    @Size(max = 100, message = "TÃªn hiá»ƒn thá»‹ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 100 kÃ½ tá»±")
    String nameDisplay;

    @NotNull(message = "ÄÃ¡nh giÃ¡ khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Min(value = 1, message = "ÄÃ¡nh giÃ¡ pháº£i tá»« 1 Ä‘áº¿n 5 sao")
    @Max(value = 5, message = "ÄÃ¡nh giÃ¡ pháº£i tá»« 1 Ä‘áº¿n 5 sao")
    Integer rating;

    @Size(max = 1000, message = "BÃ¬nh luáº­n khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 1000 kÃ½ tá»±")
    String comment;

    User user;
    Product product;
}
