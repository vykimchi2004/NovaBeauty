package com.nova_beauty.backend.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    // API không cần xác thực (ai cũng có thể gọi được).
    private static final String[] PUBLIC_POST_ENDPOINTS = {
        "/users",
        "/auth/token",
        "/auth/introspect",
        "/auth/logout",
        "/auth/refresh",
        "/auth/send-otp",
        "/auth/verify-otp",
        "/auth/reset-password",
        "/shipments/ghn/fees",
        "/shipments/ghn/leadtime",
        "/api/momo/ipn-handler"
    };

    private static final String[] PUBLIC_GET_ENDPOINTS = {
        "/product_media/**",
        "/voucher_media/**",
        "/promotion_media/**",
        "/profile_media/**",
        "/reviews/**",
        "/vouchers/**",
        "/promotions/**",
        "/products/**",
        "/categories/**",
        "/uploads/**",
        "/assets/**",
        "/banners/active",
        "/shipments/ghn/provinces",
        "/shipments/ghn/districts",
        "/shipments/ghn/wards",
        "/error"  // Allow error endpoint to be accessed without authentication
    };

    private final CustomJwtDecoder customJwtDecoder;

    public SecurityConfig(CustomJwtDecoder customJwtDecoder) {
        this.customJwtDecoder = customJwtDecoder;
    }

    // Cấu hình security: Quản lý quyền truy cập endpoint
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity.authorizeHttpRequests(request -> request
                .requestMatchers(HttpMethod.GET,PUBLIC_GET_ENDPOINTS).permitAll()
                .requestMatchers(HttpMethod.POST, PUBLIC_POST_ENDPOINTS).permitAll()
                .anyRequest()
                .authenticated()); // Tất cả request khác đều buộc phải có JWT hợp lệ

        // Báº­t cháº¿ Ä‘á»™ resource server theo chuáº©n OAuth2, xÃ¡c thá»±c request báº±ng JWT
        httpSecurity.oauth2ResourceServer(
                oauth2 -> oauth2.jwt(jwtConfigurer -> jwtConfigurer
                                .decoder(customJwtDecoder) // DÃ¹ng jwtDecoder Ä‘á»ƒ giáº£i mÃ£ vÃ  xÃ¡c minh token
                                .jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(
                                new JwtAuthenticationEntryPoint()) // Äiá»u hÆ°á»›ng user sau khi authentication fail
                );

        httpSecurity.csrf(
                AbstractHttpConfigurer
                        ::disable); // Tắt CSRF, thường làm với REST API vì không cần bảo vệ form như web app

        return httpSecurity.build();
    }

    // Cấu hình CORS cho API
    @Bean
    public CorsFilter corsFilter() { 
        CorsConfiguration corsConfiguration = new CorsConfiguration();

        // Cấu hình core
        corsConfiguration.addAllowedOrigin("*"); // Cho web truy cập API này vào những trang web nào
        corsConfiguration.addAllowedMethod("*"); // Cho phép method nào được gọi từ origin này
        corsConfiguration.addAllowedHeader("*"); // Cho phép tất cả header được truy cập

        UrlBasedCorsConfigurationSource urlBasedCorsConfigurationSource = new UrlBasedCorsConfigurationSource();
        urlBasedCorsConfigurationSource.registerCorsConfiguration("/**", corsConfiguration);

        return new CorsFilter(urlBasedCorsConfigurationSource);
    }

    // Customize authority mapper cho converter
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter jwtGrantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        jwtGrantedAuthoritiesConverter.setAuthorityPrefix("ROLE_"); // Thêm prefix "ROLE_" để hasRole() hoạt động
        // Extract authorities từ claim "scope" thay vì "scp"
        jwtGrantedAuthoritiesConverter.setAuthoritiesClaimName("scope");

        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(jwtGrantedAuthoritiesConverter);

        return jwtAuthenticationConverter;
    }

    // Mã hóa mật khẩu
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
