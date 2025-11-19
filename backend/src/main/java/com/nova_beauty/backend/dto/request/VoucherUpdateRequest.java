package com.nova_beauty.backend.dto.request;

import java.time.LocalDate;
import java.util.Set;

import jakarta.validation.constraints.*;

import com.nova_beauty.backend.enums.DiscountApplyScope;
import com.nova_beauty.backend.enums.DiscountValueType;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class VoucherUpdateRequest {

    @Size(max = 255, message = "TÃªn voucher khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String name;

    @Size(max = 50, message = "MÃ£ voucher khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 50 kÃ½ tá»±")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "MÃ£ voucher chá»‰ Ä‘Æ°á»£c chá»©a chá»¯ hoa, sá»‘, dáº¥u gáº¡ch ngang vÃ  gáº¡ch dÆ°á»›i")
    String code;

    String imageUrl;

    @Size(max = 1000, message = "MÃ´ táº£ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 1000 kÃ½ tá»±")
    String description;

    @DecimalMin(value = "0.0", message = "GiÃ¡ trá»‹ giáº£m giÃ¡ pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double discountValue;

    @DecimalMin(value = "0.0", message = "GiÃ¡ trá»‹ Ä‘Æ¡n hÃ ng tá»‘i thiá»ƒu pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double minOrderValue;

    @DecimalMin(value = "0.0", message = "GiÃ¡ trá»‹ giáº£m tá»‘i Ä‘a pháº£i lá»›n hÆ¡n hoáº·c báº±ng 0")
    Double maxDiscountValue;

    DiscountValueType discountValueType;

    DiscountApplyScope applyScope;

    @Future(message = "NgÃ y báº¯t Ä‘áº§u pháº£i lÃ  ngÃ y trong tÆ°Æ¡ng lai")
    LocalDate startDate;

    @Future(message = "NgÃ y káº¿t thÃºc pháº£i lÃ  ngÃ y trong tÆ°Æ¡ng lai")
    LocalDate expiryDate;

    @Min(value = 1, message = "Giá»›i háº¡n sá»­ dá»¥ng pháº£i lá»›n hÆ¡n 0")
    Integer usageLimit;
    
    @Min(value = 1, message = "Sá»‘ láº§n má»—i user Ä‘Æ°á»£c dÃ¹ng pháº£i lá»›n hÆ¡n 0")
    Integer usagePerUser; // Sá»‘ láº§n má»—i user Ä‘Æ°á»£c dÃ¹ng voucher nÃ y

    // Ãp dá»¥ng theo danh má»¥c
    Set<String> categoryIds;

    // Ãp dá»¥ng theo sáº£n pháº©m cá»¥ thá»ƒ
    Set<String> productIds;
}
