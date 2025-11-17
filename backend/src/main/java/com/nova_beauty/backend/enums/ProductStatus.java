package com.nova_beauty.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ProductStatus {
    PENDING("Chá» duyá»‡t"),
    APPROVED("ÄÃ£ duyá»‡t"),
    REJECTED("Tá»« chá»‘i"),
    DISABLED("VÃ´ hiá»‡u hÃ³a");

    private final String displayName;

    ProductStatus(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    @JsonCreator
    public static ProductStatus fromString(String value) {
        if (value == null) {
            return null;
        }
        // TÃ¬m theo displayName (tiáº¿ng Viá»‡t)
        for (ProductStatus status : ProductStatus.values()) {
            if (status.displayName.equals(value)) {
                return status;
            }
        }
        // Fallback: tÃ¬m theo enum name (tiáº¿ng Anh) Ä‘á»ƒ tÆ°Æ¡ng thÃ­ch ngÆ°á»£c
        try {
            return ProductStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}

