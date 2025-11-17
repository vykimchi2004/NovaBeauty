package com.nova_beauty.backend.configuration;

import java.io.IOException;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.exception.ErrorCode;

// Gá»i API mÃ  khÃ´ng cÃ³ JWT token, hoáº·c token sau/háº¿t háº¡n -> Spring tá»± Ä‘á»™ng nháº£y vÃ o Ä‘Ã¢y AuthenticationEntryPoint
// -> Class nÃ y giÃºp API tráº£ vá» lá»—i 401 dÆ°á»›i dáº¡ng JSON chuáº©n, thay vÃ¬ response HTML máº·c Ä‘á»‹nh.
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {
    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException, ServletException {
        log.error("ðŸš« JWT Authentication failed: method={}, uri={}, error={}", 
                request.getMethod(), request.getRequestURI(), authException.getMessage());
        ErrorCode errorCode = ErrorCode.UNAUTHENTICATED;

        response.setStatus(errorCode.getStatusCode().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();

        ObjectMapper objectMapper = new ObjectMapper();

        response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        response.flushBuffer(); // Äáº£m báº£o dá»¯ liá»‡u dÆ°á»£c gá»­i ngay vá» client
    }
}
