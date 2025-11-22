package com.nova_beauty.backend.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderDetailResponse {

    String id;
    String code;

    String customerName;
    String customerEmail;

    String shippingAddress;
    String receiverName;
    String receiverPhone;
    LocalDate orderDate;
    LocalDateTime orderDateTime;

    Double shippingFee;
    Double totalAmount;
    String status;
    String paymentMethod;
    String paymentStatus;
    Boolean paid;
    String paymentReference;

    List<OrderItemResponse> items;
}

