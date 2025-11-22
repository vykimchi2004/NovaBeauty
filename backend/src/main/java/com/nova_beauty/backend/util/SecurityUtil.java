package com.nova_beauty.backend.util;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;

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

