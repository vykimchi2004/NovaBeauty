package com.nova_beauty.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.*;

import com.nova_beauty.backend.enums.CancellationSource;
import com.nova_beauty.backend.enums.OrderStatus;
import com.nova_beauty.backend.enums.PaymentMethod;
import com.nova_beauty.backend.enums.PaymentStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    User user;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id")
    Cart cart;

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    Shipment shipment;

    /**
     * Mã đơn hàng hiển thị cho khách (ví dụ: NVB20241120ABC123).
     */
    @Column(name = "order_code", unique = true)
    String code;

    @Column(columnDefinition = "TEXT")
    String note;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    String cancellationReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancellation_source", length = 32)
    CancellationSource cancellationSource;
    String shippingAddress;
    LocalDate orderDate;

    /**
     * Thời điểm tạo đơn hàng đầy đủ (bao gồm giờ/phút/giây).
     */
    @Column(name = "order_date_time")
    LocalDateTime orderDateTime;
    LocalDate expectedDeliveryDate;
    Double shippingFee;
    Double totalAmount; // subtotalAmount + shippingFee

    @Column(name = "is_paid")
    Boolean paid;

    @Column(name = "cart_item_ids", columnDefinition = "TEXT")
    String cartItemIdsSnapshot;

    @Column(name = "applied_voucher_code")
    String appliedVoucherCode; // Mã voucher đã áp dụng cho đơn hàng

    @Column(name = "applied_voucher_id")
    String appliedVoucherId; // ID voucher đã áp dụng (để kiểm tra usage chính xác)

    @Column(name = "voucher_discount")
    Double voucherDiscount; // Số tiền giảm giá từ voucher

    @Column(name = "payment_reference")
    String paymentReference;

    @Enumerated(EnumType.STRING)
    OrderStatus status;

    @Enumerated(EnumType.STRING)
    PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    PaymentStatus paymentStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "address_id")
    Address address;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    List<OrderItem> items;

    // Refund/Return request fields
    @Column(name = "refund_reason_type", length = 50)
    String refundReasonType; // 'store' or 'customer'

    @Column(name = "refund_description", columnDefinition = "TEXT")
    String refundDescription;

    @Column(name = "refund_email", length = 255)
    String refundEmail;

    @Column(name = "refund_return_address", columnDefinition = "TEXT")
    String refundReturnAddress;

    @Column(name = "refund_method", length = 100)
    String refundMethod;

    @Column(name = "refund_bank", length = 100)
    String refundBank;

    @Column(name = "refund_account_number", length = 50)
    String refundAccountNumber;

    @Column(name = "refund_account_holder", length = 255)
    String refundAccountHolder;

    @Column(name = "refund_amount")
    Double refundAmount;

    @Column(name = "refund_return_fee")
    Double refundReturnFee; // Phí trả hàng (10% giá trị sản phẩm nếu lý do là customer, 0 nếu lý do là store)

    @Column(name = "refund_second_shipping_fee")
    Double refundSecondShippingFee;

    @Column(name = "refund_penalty_amount")
    Double refundPenaltyAmount;

    @Column(name = "refund_total_paid")
    Double refundTotalPaid;

    // Staff confirmed values
    @Column(name = "refund_confirmed_amount")
    Double refundConfirmedAmount;

    @Column(name = "refund_confirmed_penalty")
    Double refundConfirmedPenalty;

    @Column(name = "refund_confirmed_second_shipping_fee")
    Double refundConfirmedSecondShippingFee;

    @Column(name = "refund_selected_product_ids", columnDefinition = "TEXT")
    String refundSelectedProductIds; // JSON array of product IDs

    @Column(name = "refund_media_urls", columnDefinition = "TEXT")
    String refundMediaUrls; // JSON array of media URLs (images/videos)

    @Column(name = "refund_rejection_reason", columnDefinition = "TEXT")
    String refundRejectionReason; // Lý do từ chối hoàn tiền từ CSKH

    @Column(name = "refund_rejection_source", length = 50)
    String refundRejectionSource; // Ai đã từ chối: CSKH / STAFF

    @Column(name = "return_checked_date")
    LocalDate returnCheckedDate;

    @Column(name = "staff_inspection_result", columnDefinition = "TEXT")
    String staffInspectionResult;

    @Column(name = "admin_processing_note", columnDefinition = "TEXT")
    String adminProcessingNote;
}
