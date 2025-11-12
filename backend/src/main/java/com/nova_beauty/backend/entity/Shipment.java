package com.nova_beauty.backend.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import jakarta.persistence.*;

import com.nova_beauty.backend.enums.ShipmentProvider;
import com.nova_beauty.backend.enums.ShipmentStatus;

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

    String orderCode;

    LocalDate shippedDate;
    LocalDate estimatedDelivery;

    OffsetDateTime expectedDeliveryTime;

    @OneToOne
    @JoinColumn(name = "order_id")
    Order order;

    @Enumerated(EnumType.STRING)
    ShipmentProvider provider;

    @Enumerated(EnumType.STRING)
    ShipmentStatus status;

    String sortCode;
    String transType;
    String wardEncode;
    String districtEncode;

    Long feeMainService;
    Long feeInsurance;
    Long feeStationDo;
    Long feeStationPu;
    Long feeReturn;
    Long feeR2s;
    Long feeCoupon;
    Long feeCodFailedFee;
    Long totalFee;
}


