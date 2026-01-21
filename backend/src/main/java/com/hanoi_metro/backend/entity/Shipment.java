package com.hanoi_metro.backend.entity;

import java.time.LocalDate;

import jakarta.persistence.*;

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
@Entity
public class Shipment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @OneToOne
    @JoinColumn(name = "order_id")
    Order order;

    @Enumerated(EnumType.STRING)
    ShipmentProvider provider;

    @Enumerated(EnumType.STRING)
    ShipmentStatus status;

    String orderCode; // GHN order code để tracking

    LocalDate shippedDate;
    LocalDate estimatedDelivery;

    Long totalFee; // Tổng phí vận chuyển (VND)
}
