package com.nova_beauty.backend.entity;

import java.time.LocalDate;

import jakarta.persistence.*;

import com.nova_beauty.backend.enums.OrderStatus;

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

    String note;
    String shippingAddress;
    LocalDate orderDate;
    LocalDate expectedDeliveryDate;
    Double shippingFee;
    Double totalAmount; // subtotalAmount + shippingFee

    @Enumerated(EnumType.STRING)
    OrderStatus status;
}
