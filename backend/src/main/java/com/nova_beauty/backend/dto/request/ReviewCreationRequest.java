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

    @Size(max = 100, message = "Tên hiển thị không được vượt quá 100 ký tự")
    String nameDisplay;

    @NotNull(message = "Đánh giá không được để trống")
    @Min(value = 1, message = "Đánh giá phải từ 1 đến 5 sao")
    @Max(value = 5, message = "Đánh giá phải từ 1 đến 5 sao")
    Integer rating;

    @Size(max = 1000, message = "Bình luận không được vượt quá 1000 ký tự")
    String comment;

    User user;
    Product product;
}
