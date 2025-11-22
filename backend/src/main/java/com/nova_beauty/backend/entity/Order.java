package com.nova_beauty.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.*;

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

    String note;
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
}
