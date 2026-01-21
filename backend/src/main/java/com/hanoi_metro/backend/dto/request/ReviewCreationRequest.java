package com.hanoi_metro.backend.dto.request;

import jakarta.validation.constraints.*;

import com.hanoi_metro.backend.entity.Product;
import com.hanoi_metro.backend.entity.User;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReviewCreationRequest {

    @Size(max = 100, message = "Tên hiển thị không được vượt quá 100 ký tự")
    String nameDisplay;

    @NotNull(message = "Đánh giá không được để trống")
    @Min(value = 1, message = "Đánh giá phải từ 1 đến 5 sao")
    @Max(value = 5, message = "Đánh giá phải từ 1 đến 5 sao")
    Integer rating;

    @Size(max = 1000, message = "Bình luận không được vượt quá 1000 ký tự")
    String comment;

    User user;
    
    // Product object - Jackson sẽ deserialize { id: "..." } thành Product với @Setter
    // Nếu product chỉ có id, Jackson sẽ tạo Product object và set id
    Product product;
    
    // OrderItem ID - để liên kết review với đơn hàng cụ thể
    // Mỗi đơn hàng chỉ được đánh giá 1 lần
    @NotNull(message = "OrderItem ID không được để trống")
    String orderItemId;
    
    // Helper method để lấy productId an toàn
    public String getProductId() {
        return product != null ? product.getId() : null;
    }
}
