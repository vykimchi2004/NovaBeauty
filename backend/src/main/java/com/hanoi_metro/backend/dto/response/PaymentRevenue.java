package com.hanoi_metro.backend.dto.response;

import com.hanoi_metro.backend.enums.PaymentMethod;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentRevenue {
    PaymentMethod paymentMethod;
    Double total;
}
