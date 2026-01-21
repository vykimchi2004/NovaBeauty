package com.hanoi_metro.backend.util;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import com.hanoi_metro.backend.exception.AppException;
import com.hanoi_metro.backend.exception.ErrorCode;

public final class SecurityUtil {
    private SecurityUtil() {
    }

    public static Authentication getAuthentication() {
        SecurityContext context = SecurityContextHolder.getContext();
        Authentication authentication = context != null ? context.getAuthentication() : null;

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        return authentication;
    }

    public static String getCurrentUserEmail() {
        return getAuthentication().getName();
    }
}

