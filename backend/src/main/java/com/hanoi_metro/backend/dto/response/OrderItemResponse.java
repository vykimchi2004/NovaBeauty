package com.hanoi_metro.backend.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderItemResponse {

    String id;
    String productId;
    String name;
    String imageUrl;
    Integer quantity;
    Double unitPrice;
    Double totalPrice;
}

