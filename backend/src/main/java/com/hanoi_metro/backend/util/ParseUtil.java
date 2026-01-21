package com.hanoi_metro.backend.util;

import com.hanoi_metro.backend.exception.AppException;
import com.hanoi_metro.backend.exception.ErrorCode;

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

