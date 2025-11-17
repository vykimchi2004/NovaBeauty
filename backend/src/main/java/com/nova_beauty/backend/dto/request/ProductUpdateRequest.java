package com.nova_beauty.backend.dto.request;

import java.time.LocalDate;

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

    @Size(max = 5000, message = "Mô tả chi tiết không được vượt quá 5000 ký tự")
    String detailedDescription;

    String size;

    @Size(max = 255, message = "Tên tác giả không được vượt quá 255 ký tự")
    String author;

    @Size(max = 255, message = "Tên nhà xuất bản không được vượt quá 255 ký tự")
    String publisher;

    @Size(max = 255, message = "Thương hiệu không được vượt quá 255 ký tự")
    String brand;

    @Size(max = 255, message = "Xuất xứ thương hiệu không được vượt quá 255 ký tự")
    String brandOrigin;

    @Size(max = 255, message = "Nơi sản xuất không được vượt quá 255 ký tự")
    String manufacturingLocation;

    @Size(max = 2000, message = "Đặc tính không được vượt quá 2000 ký tự")
    String characteristics;

    @Size(max = 5000, message = "Thành phần không được vượt quá 5000 ký tự")
    String ingredients;

    @Size(max = 2000, message = "Công dụng không được vượt quá 2000 ký tự")
    String uses;

    @Size(max = 2000, message = "Cách dùng không được vượt quá 2000 ký tự")
    String usageInstructions;

    @DecimalMin(value = "0.0", message = "Trọng lượng phải lớn hơn hoặc bằng 0")
    Double weight;

    @DecimalMin(value = "0.0", message = "Chiều dài phải lớn hơn hoặc bằng 0")
    Double length;

    @DecimalMin(value = "0.0", message = "Chiều rộng phải lớn hơn hoặc bằng 0")
    Double width;

    @DecimalMin(value = "0.0", message = "Chiều cao phải lớn hơn hoặc bằng 0")
    Double height;

    @DecimalMin(value = "0.0", message = "Giá niêm yết phải lớn hơn hoặc bằng 0")
    Double unitPrice;

    @DecimalMin(value = "0.0", message = "Giá bán phải lớn hơn hoặc bằng 0")
    Double price;

    @DecimalMin(value = "0.0", message = "Thuế phải lớn hơn hoặc bằng 0")
    Double tax;

    @DecimalMin(value = "0.0", message = "Giá trị giảm giá phải lớn hơn hoặc bằng 0")
    Double discountValue;

    LocalDate publicationDate;

    String categoryId;
}
