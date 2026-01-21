package com.hanoi_metro.backend.dto.request;

import java.time.LocalDate;
import java.util.List;

import com.hanoi_metro.backend.enums.ProductStatus;
import jakarta.validation.constraints.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductUpdateRequest {

    @Size(max = 255, message = "Tên sản phẩm không được vượt quá 255 ký tự")
    String name;

    @Size(max = 2000, message = "Mô tả không được vượt quá 2000 ký tự")
    String description;

    String size;
    String brand;
    String brandOrigin;
    String manufacturingLocation;
    String texture; // Kết cấu
    String skinType; // Loại da

    @Size(max = 2000, message = "Đặc điểm không được vượt quá 2000 ký tự")
    String characteristics;

    @Size(max = 2000, message = "Thành phần không được vượt quá 2000 ký tự")
    String ingredients;

    @Size(max = 2000, message = "Công dụng không được vượt quá 2000 ký tự")
    String uses;

    @Size(max = 2000, message = "Hướng dẫn sử dụng không được vượt quá 2000 ký tự")
    String usageInstructions;

    @DecimalMin(value = "0.0", message = "Trọng lượng phải lớn hơn hoặc bằng 0")
    Double weight;

    @Min(value = 1, message = "Chiều dài phải lớn hơn hoặc bằng 1")
    Double length;

    @Min(value = 1, message = "Chiều rộng phải lớn hơn hoặc bằng 1")
    Double width;

    @Min(value = 1, message = "Chiều cao phải lớn hơn hoặc bằng 1")
    Double height;

    @DecimalMin(value = "0.0", message = "Giá niêm yết (giá gốc) phải lớn hơn hoặc bằng 0")
    Double unitPrice;

    @DecimalMin(value = "0.0", message = "Giá nhập phải lớn hơn hoặc bằng 0")
    Double purchasePrice;

    @DecimalMin(value = "0.0", message = "Thuế phải lớn hơn hoặc bằng 0")
    Double tax;

    @DecimalMin(value = "0.0", message = "Giá trị giảm giá phải lớn hơn hoặc bằng 0")
    Double discountValue;

    LocalDate publicationDate;

    String categoryId;

    // Promotion (optional)
    String promotionId;

    ProductStatus status;

    @Min(value = 0, message = "Số lượng tồn kho phải >= 0")
    Integer stockQuantity;

    // Media fields
    List<String> imageUrls;
    List<String> videoUrls;
    String defaultMediaUrl;
}




