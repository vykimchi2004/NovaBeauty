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
@PromotionDateConstraint // Validate ngày bắt đầu và kết thúc
@PromotionScopeConstraint
public class PromotionCreationRequest {

    @NotBlank(message = "Tên khuyến mãi không được để trống")
    @Size(max = 255, message = "Tên khuyến mãi không được vượt quá 255 ký tự")
    String name;

    @NotBlank(message = "Mã khuyến mãi không được để trống")
    @Size(max = 50, message = "Mã khuyến mãi không được vượt quá 50 ký tự")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Mã khuyến mãi chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới")
    @PromotionCodeConstraint // Validate mã khuyến mãi unique
    String code;

    String imageUrl;

    @Size(max = 1000, message = "Mô tả không được vượt quá 1000 ký tự")
    String description;

    @NotNull(message = "Giá trị giảm giá không được để trống")
    @DecimalMin(value = "0.0", message = "Giá trị giảm giá phải lớn hơn hoặc bằng 0")
    Double discountValue;

    @DecimalMin(value = "0.0", message = "Giá trị đơn hàng tối thiểu phải lớn hơn hoặc bằng 0")
    Double minOrderValue;

    @DecimalMin(value = "0.0", message = "Giá trị giảm tối đa phải lớn hơn hoặc bằng 0")
    Double maxDiscountValue;

    @NotNull(message = "Loại giá trị giảm không được để trống")
    DiscountValueType discountValueType;

    @NotNull(message = "Phạm vi áp dụng không được để trống")
    DiscountApplyScope applyScope;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    @FutureOrPresent(message = "Ngày bắt đầu không được trước ngày hiện tại")
    LocalDate startDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    @FutureOrPresent(message = "Ngày kết thúc không được trước ngày hiện tại")
    LocalDate expiryDate;

    // Áp dụng theo danh mục
    @Min(value = 1, message = "Giới hạn sử dụng phải lớn hơn 0")
    Integer usageLimit;

    // Ãp dá»¥ng theo danh má»¥c
    Set<String> categoryIds;

    // Áp dụng theo sản phẩm cụ thể
    Set<String> productIds;
}
