package com.hanoi_metro.backend.dto.request;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BannerUpdateRequest {

    @Size(max = 255, message = "Tiêu đề không được vượt quá 255 ký tự")
    String title;

    @Size(max = 30000, message = "Mô tả không được vượt quá 30000 ký tự")
    String description;

    String category;

    String imageUrl;
    String linkUrl;
    Boolean status;
    
    @Size(max = 2000, message = "Lý do từ chối không được vượt quá 2000 ký tự")
    String rejectionReason;

    @Min(value = 0, message = "Thứ tự sắp xếp phải lớn hơn hoặc bằng 0")
    Integer orderIndex;

    List<String> productIds;

    LocalDate startDate;

    LocalDate endDate;
    
    // Allow updating magazine flag (only staff should be able to set this via UI)
    Boolean isMagazine;
}
