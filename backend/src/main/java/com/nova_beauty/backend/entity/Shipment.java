package com.nova_beauty.backend.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import jakarta.persistence.*;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

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

    // GHN order Ä‘á»ƒ theo dÃµi Ä‘Æ¡n hÃ ng
    String orderCode;

    LocalDate shippedDate;
    LocalDate estimatedDelivery;

    // Thá»i gian giao hÃ ng dá»± kiáº¿n tráº£ vá» tá»« GHN
    OffsetDateTime expectedDeliveryTime;

    @OneToOne
    @JoinColumn(name = "order_id")
    Order order;

    @Enumerated(EnumType.STRING)
    ShipmentProvider provider;

    @Enumerated(EnumType.STRING)
    ShipmentStatus status;

    // CÃ¡c trÆ°á»ng tráº£ vá» tá»« GHN
    String sortCode;
    String transType;
    String wardEncode;
    String districtEncode;

    // CÃ¡c fee breakdown (VND)
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
