package com.hanoi_metro.backend.constant;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class OrderReturnStage {
    public static final String CUSTOMER_REQUESTED = "RETURN_REQUESTED";
    public static final String CS_CONFIRMED = "RETURN_CS_CONFIRMED";
    public static final String STAFF_CONFIRMED = "RETURN_STAFF_CONFIRMED";
    public static final String ADMIN_COMPLETED = "REFUNDED";
    public static final String REJECTED = "RETURN_REJECTED";
}


