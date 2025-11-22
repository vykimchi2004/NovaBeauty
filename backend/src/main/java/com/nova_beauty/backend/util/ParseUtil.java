package com.nova_beauty.backend.util;

import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;

public final class ParseUtil {
    private ParseUtil() {
    }

    public static Integer parseInteger(String value, String fieldName) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }
    }
}

