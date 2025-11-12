package com.nova_beauty.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ProductStatus {
    PENDING("Chờ duyệt"),
    APPROVED("Đã duyệt"),
    REJECTED("Từ chối"),
    DISABLED("Vô hiệu hóa");

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
        // Tìm theo displayName (tiếng Việt)
        for (ProductStatus status : ProductStatus.values()) {
            if (status.displayName.equals(value)) {
                return status;
            }
        }
        // Fallback: tìm theo enum name (tiếng Anh) để tương thích ngược
        try {
            return ProductStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}

