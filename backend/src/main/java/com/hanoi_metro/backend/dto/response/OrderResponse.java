package com.hanoi_metro.backend.dto.response;

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
public class OrderResponse {

    String id;

    /**
     * Mã đơn hàng hiển thị (hiện tại dùng luôn id, có thể thay đổi sau).
     */
    String code;

    String customerName;

    String customerEmail;

    String receiverName;

    String receiverPhone;

    String shippingAddress;

    LocalDate orderDate;
    LocalDateTime orderDateTime;

    Double shippingFee;
    Double totalAmount;

    /**
     * Trạng thái đơn hàng dạng chuỗi (CREATED, PAID, SHIPPED, ...).
     */
    String status;

    String paymentMethod;
    String paymentStatus;
    Boolean paid;
    String paymentReference;
    
    /**
     * Danh sách sản phẩm trong đơn hàng
     */
    List<OrderItemResponse> items;

    // Refund/Return request information
    String refundReasonType;
    String refundDescription;
    String refundEmail;
    String refundReturnAddress;
    String refundMethod;
    String refundBank;
    String refundAccountNumber;
    String refundAccountHolder;
    Double refundAmount;
    Double refundReturnFee;
}

