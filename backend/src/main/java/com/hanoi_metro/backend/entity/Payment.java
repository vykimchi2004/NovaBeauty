package com.hanoi_metro.backend.entity;

import java.time.LocalDate;

import jakarta.persistence.*;

import com.hanoi_metro.backend.enums.PaymentMethod;
import com.hanoi_metro.backend.enums.PaymentStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    Double amount;
    LocalDate paymentDate;

    @OneToOne
    @JoinColumn(name = "order_id")
    Order order;

    @Enumerated(EnumType.STRING)
    PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    PaymentStatus status;
}
