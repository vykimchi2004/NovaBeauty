package com.nova_beauty.backend.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CartItemResponse {
    String id;
    String productId;
    String productName;
    Double unitPrice;
    Integer quantity;
    Double finalPrice;
}


