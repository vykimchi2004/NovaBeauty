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
public class PromotionUpdateRequest {

    @Size(max = 255, message = "Tên khuyến mãi không được vượt quá 255 ký tự")
    String name;

    @Size(max = 50, message = "Mã khuyến mãi không được vượt quá 50 ký tự")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Mã khuyến mãi chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới")
    String code;

    String imageUrl;

    @Size(max = 1000, message = "Mô tả không được vượt quá 1000 ký tự")
    String description;

    @DecimalMin(value = "0.0", message = "Giá trị giảm giá phải lớn hơn hoặc bằng 0")
    Double discountValue;

    @DecimalMin(value = "0.0", message = "Giá trị đơn hàng tối thiểu phải lớn hơn hoặc bằng 0")
    Double minOrderValue;

    @DecimalMin(value = "0.0", message = "Giá trị giảm tối đa phải lớn hơn hoặc bằng 0")
    Double maxDiscountValue;

    DiscountValueType discountValueType;

    DiscountApplyScope applyScope;

    @FutureOrPresent(message = "Ngày bắt đầu không được trước ngày hiện tại")
    LocalDate startDate;

    @FutureOrPresent(message = "Ngày kết thúc không được trước ngày hiện tại")
    LocalDate expiryDate;

    // Áp dụng theo danh mục
    Set<String> categoryIds;

    // Áp dụng theo sản phẩm cụ thể
    Set<String> productIds;
}
