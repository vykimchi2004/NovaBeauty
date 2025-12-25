package com.nova_beauty.backend.dto.request;

import java.time.LocalDate;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MagazineUpdateRequest {
    String title;
    String content;
    String imageUrl;
    LocalDate startDate;
    LocalDate endDate;
    Boolean status;
}
