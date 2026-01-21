package com.hanoi_metro.backend.dto.request;

import java.time.LocalDate;
import java.util.Set;

import jakarta.validation.constraints.*;

import com.hanoi_metro.backend.enums.DiscountApplyScope;
import com.hanoi_metro.backend.enums.DiscountValueType;
import com.hanoi_metro.backend.validator.VoucherCodeConstraint;
import com.hanoi_metro.backend.validator.VoucherDateConstraint;
import com.hanoi_metro.backend.validator.VoucherScopeConstraint;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@VoucherDateConstraint
@VoucherScopeConstraint
public class VoucherCreationRequest {

    @NotBlank(message = "Tên voucher không được để trống")
    @Size(max = 255, message = "Tên voucher không được vượt quá 255 ký tự")
    String name;

    @NotBlank(message = "Mã voucher không được để trống")
    @Size(max = 50, message = "Mã voucher không được vượt quá 50 ký tự")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Mã voucher chỉ được chứa chữ hoa, số, dấu gạch ngang và gạch dưới")
    @VoucherCodeConstraint // Validate mã voucher unique
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

    @Min(value = 1, message = "Giới hạn sử dụng phải lớn hơn 0")
    Integer usageLimit;
    
    @Min(value = 1, message = "Số lần mỗi user được dùng phải lớn hơn 0")
    Integer usagePerUser; // Số lần mỗi user được dùng voucher này

    // Áp dụng theo danh mục
    Set<String> categoryIds;

    // Áp dụng theo sản phẩm cụ thể
    Set<String> productIds;
}
