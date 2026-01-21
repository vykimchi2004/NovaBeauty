package com.hanoi_metro.backend.enums;

public enum ServiceTypeId {
    LIGHT(2),
    HEAVY(5);

    public final int code;

    ServiceTypeId(int code) {
        this.code = code;
    }
}
