package com.hanoi_metro.backend.dto.request;

import jakarta.validation.constraints.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CategoryUpdateRequest {

    String id;

    @Size(max = 255, message = "Tên danh mục không được vượt quá 255 ký tự")
    String name;

    @Size(max = 1000, message = "Mô tả không được vượt quá 1000 ký tự")
    String description;

    Boolean status;

    String parentId;
}
