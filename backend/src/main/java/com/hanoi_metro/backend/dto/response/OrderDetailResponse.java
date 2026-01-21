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
    Double refundReturnFee; // Phí trả hàng
    Double refundSecondShippingFee;
    Double refundPenaltyAmount;
    Double refundTotalPaid;
    Double refundConfirmedAmount;
    Double refundConfirmedPenalty;
    Double refundConfirmedSecondShippingFee;
    LocalDate returnCheckedDate;
    String refundSelectedProductIds; // JSON array string
    String refundMediaUrls; // JSON array string of media URLs
    String refundRejectionReason; // Lý do từ chối hoàn tiền từ CSKH
    String refundRejectionSource;
    String staffInspectionResult;
    String adminProcessingNote;
    String note; // Ghi chú của đơn hàng
}

