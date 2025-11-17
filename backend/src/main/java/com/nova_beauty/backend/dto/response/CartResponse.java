package com.nova_beauty.backend.dto.response;

import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CartResponse {
    String id;
    Double subtotal;
    String appliedVoucherCode;
    Double voucherDiscount;
    Double totalAmount;
    List<CartItemResponse> items;
}
