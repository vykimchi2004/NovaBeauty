package com.hanoi_metro.backend.enums;

public enum PaymentTypeId {
    SENDER(1),
    RECEIVER(2);

    public final int code;

    PaymentTypeId(int code) {
        this.code = code;
    }
}
