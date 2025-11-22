package com.nova_beauty.backend.dto.request;

import java.time.LocalDate;
import java.util.Set;

import jakarta.validation.constraints.*;

import com.nova_beauty.backend.enums.DiscountApplyScope;
import com.nova_beauty.backend.enums.DiscountValueType;
import com.nova_beauty.backend.validator.PromotionDateConstraint;
import com.nova_beauty.backend.validator.PromotionScopeConstraint;
import com.nova_beauty.backend.validator.PromotionCodeConstraint;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@PromotionDateConstraint // Validate ngÃ y báº¯t Ä‘áº§u vÃ  káº¿t thÃºc
@PromotionScopeConstraint
public class PromotionCreationRequest {

    @NotBlank(message = "TÃªn khuyáº¿n mÃ£i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Size(max = 255, message = "TÃªn khuyáº¿n mÃ£i khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String name;

    @NotBlank(message = "MÃ£ khuyáº¿n mÃ£i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Size(max = 50, message = "MÃ£ khuyáº¿n mÃ£i khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 50 kÃ½ tá»±")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "MÃ£ khuyáº¿n mÃ£i chá»‰ Ä‘Æ°á»£c chá»©a chá»¯ hoa, sá»‘, dáº¥u gáº¡ch ngang vÃ  gáº¡ch dÆ°á»›i")
    @PromotionCodeConstraint // Validate mÃ£ khuyáº¿n mÃ£i unique
    String code;

    String imageUrl;

    @Size(max = 1000, message = "MÃ´ táº£ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 1000 kÃ½ tá»±")
    String description;

    @NotNull(message = "GiÃ¡ trá»‹ giáº£m giÃ¡ khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @DecimalMin(value = "0.0", message = "GiÃ¡ trá»‹ giáº£m giÃ¡ pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double discountValue;

    @DecimalMin(value = "0.0", message = "GiÃ¡ trá»‹ Ä‘Æ¡n hÃ ng tá»‘i thiá»ƒu pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double minOrderValue;

    @DecimalMin(value = "0.0", message = "GiÃ¡ trá»‹ giáº£m tá»‘i Ä‘a pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double maxDiscountValue;

    @NotNull(message = "Loáº¡i giÃ¡ trá»‹ giáº£m khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    DiscountValueType discountValueType;

    @NotNull(message = "Pháº¡m vi Ã¡p dá»¥ng khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    DiscountApplyScope applyScope;

    @NotNull(message = "NgÃ y báº¯t Ä‘áº§u khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Future(message = "NgÃ y báº¯t Ä‘áº§u pháº£i lÃ  ngÃ y trong tÆ°Æ¡ng lai")
    LocalDate startDate;

    @NotNull(message = "NgÃ y káº¿t thÃºc khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Future(message = "NgÃ y káº¿t thÃºc pháº£i lÃ  ngÃ y trong tÆ°Æ¡ng lai")
    LocalDate expiryDate;

    @Min(value = 1, message = "Giới hạn sử dụng phải lớn hơn 0")
    Integer usageLimit;

    // Ãp dá»¥ng theo danh má»¥c
    Set<String> categoryIds;

    // Ãp dá»¥ng theo sáº£n pháº©m cá»¥ thá»ƒ
    Set<String> productIds;
}
