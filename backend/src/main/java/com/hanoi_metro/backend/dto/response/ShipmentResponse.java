package com.hanoi_metro.backend.dto.response;

import java.time.LocalDate;

import com.hanoi_metro.backend.enums.ShipmentProvider;
import com.hanoi_metro.backend.enums.ShipmentStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ShipmentResponse {
    String id;
    String orderCode; // GHN order code
    String orderId; // Internal order ID
    LocalDate shippedDate;
    LocalDate estimatedDelivery;
    ShipmentProvider provider;
    ShipmentStatus status;

    Long totalFee; // Tổng phí vận chuyển (VND)
}

