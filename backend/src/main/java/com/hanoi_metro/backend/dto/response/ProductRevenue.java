package com.hanoi_metro.backend.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProductRevenue {
    String productId;
    String productName;
    Long quantity;
    Double total;
}
