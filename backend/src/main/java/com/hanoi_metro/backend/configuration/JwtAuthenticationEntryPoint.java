package com.hanoi_metro.backend.configuration;

import java.io.IOException;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanoi_metro.backend.dto.request.ApiResponse;
import com.hanoi_metro.backend.exception.ErrorCode;

// Gá»i API mÃ  khÃ´ng cÃ³ JWT token, hoáº·c token sau/háº¿t háº¡n -> Spring tá»± Ä‘á»™ng nháº£y vÃ o Ä‘Ã¢y AuthenticationEntryPoint
// -> Class nÃ y giÃºp API tráº£ vá» lá»—i 401 dÆ°á»›i dáº¡ng JSON chuáº©n, thay vÃ¬ response HTML máº·c Ä‘á»‹nh.
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {
    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException, ServletException {
        String requestURI = request.getRequestURI();
        // Cart endpoints thường được gọi khi user chưa đăng nhập (để hiển thị cart count)
        // Nên không log ERROR cho các request này, chỉ log ở mức DEBUG
        boolean isCartEndpoint = requestURI != null && requestURI.contains("/cart");
        
        if (isCartEndpoint) {
            log.debug("JWT Authentication failed (expected for cart): method={}, uri={}, error={}", 
                    request.getMethod(), requestURI, authException.getMessage());
        } else {
            log.error("🚫 JWT Authentication failed: method={}, uri={}, error={}", 
                    request.getMethod(), requestURI, authException.getMessage());
        }
        
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
