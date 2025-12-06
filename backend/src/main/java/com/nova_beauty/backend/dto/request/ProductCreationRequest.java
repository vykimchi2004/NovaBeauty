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
    @NotBlank(message = "Mã sản phẩm không được để trống")
    String id;

    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(max = 255, message = "Tên sản phẩm không được vượt quá 255 ký tự")
    String name;

    @Size(max = 2000, message = "Mô tả không được vượt quá 2000 ký tự")
    String description;

    @NotBlank(message = "Tác giả không được để trống")
    @Size(max = 255, message = "Tên tác giả không được vượt quá 255 ký tự")
    String author;
    String size;
    String brand;
    String brandOrigin;
    String manufacturingLocation;
    String texture; // Kết cấu
    String skinType; // Loại da

    @Size(max = 2000, message = "Đặc điểm không được vượt quá 2000 ký tự")
    String characteristics;

    @NotBlank(message = "Nhà xuất bản không được để trống")
    @Size(max = 255, message = "Tên nhà xuất bản không được vượt quá 255 ký tự")
    String publisher;
    @Size(max = 2000, message = "Thành phần không được vượt quá 2000 ký tự")
    String ingredients;

    @Size(max = 2000, message = "Công dụng không được vượt quá 2000 ký tự")
    String uses;

    @Size(max = 2000, message = "Hướng dẫn sử dụng không được vượt quá 2000 ký tự")
    String usageInstructions;

    // Optional fields - validation only applies if value is provided (not null)
    @DecimalMin(value = "0.0", message = "Trọng lượng phải lớn hơn hoặc bằng 0")
    Double weight;

    @DecimalMin(value = "0.0", message = "Chiều dài phải lớn hơn hoặc bằng 0")
    Double length;

    @DecimalMin(value = "0.0", message = "Chiều rộng phải lớn hơn hoặc bằng 0")
    Double width;

    @DecimalMin(value = "0.0", message = "Chiều cao phải lớn hơn hoặc bằng 0")
    Double height;

    @NotNull(message = "Giá niêm yết (giá gốc) không được để trống")
    @DecimalMin(value = "0.0", message = "Giá niêm yết phải lớn hơn hoặc bằng 0")
    Double unitPrice;

    @DecimalMin(value = "0.0", message = "Giá nhập phải lớn hơn hoặc bằng 0")
    Double purchasePrice;

    @DecimalMin(value = "0.0", message = "Thuế phải lớn hơn hoặc bằng 0")
    Double tax;

    @DecimalMin(value = "0.0", message = "Giá trị giảm giá phải lớn hơn hoặc bằng 0")
    Double discountValue;

    @NotNull(message = "Ngày xuất bản không được để trống")
    LocalDate publicationDate;

    @NotBlank(message = "Danh mục không được để trống")
    String categoryId;

    // Promotion (optional)
    String promotionId;

    // Stock quantity (optional)
    @Min(value = 0, message = "Số lượng tồn kho phải >= 0")
    Integer stockQuantity;

    // Media fields
    List<String> imageUrls;
    List<String> videoUrls;
    String defaultMediaUrl;
}




