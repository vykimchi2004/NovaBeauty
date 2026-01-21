package com.hanoi_metro.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ProductStatus {
    PENDING,
    APPROVED,
    REJECTED,
    DISABLED
}

