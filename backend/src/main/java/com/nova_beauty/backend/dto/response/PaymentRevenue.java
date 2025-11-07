package com.nova_beauty.backend.dto.response;

import com.nova_beauty.backend.enums.PaymentMethod;

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


