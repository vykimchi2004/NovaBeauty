package com.nova_beauty.backend.dto.request;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MagazineCreationRequest {
    @NotBlank(message = "Tiêu đề không được để trống")
    String title;

    String content;

    @NotBlank(message = "URL hình ảnh không được để trống")
    String imageUrl;

    LocalDate startDate;
    LocalDate endDate;
    Boolean status;
}
