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
    // API khÃ´ng cáº§n xÃ¡c thá»±c (ai cÅ©ng cÃ³ thá»ƒ gá»i Ä‘Æ°á»£c).
    private static final String[] PUBLIC_POST_ENDPOINTS = {
        "/users",
        "/auth/token",
        "/auth/introspect",
        "/auth/logout",
        "/auth/refresh",
        "/auth/send-otp",
        "/auth/verify-otp",
        "/auth/reset-password"
    };

    private static final String[] PUBLIC_GET_ENDPOINTS = {
        "/product_media/**",
        "/voucher_media/**",
        "/promotion_media/**",
        "/profile_media/**",
        "/vouchers/**",
        "/promotions/**",
        "/products/**",
        "/uploads/**",
        "/banners/active",
        "/error"  // Allow error endpoint to be accessed without authentication
    };

    private final CustomJwtDecoder customJwtDecoder;

    public SecurityConfig(CustomJwtDecoder customJwtDecoder) {
        this.customJwtDecoder = customJwtDecoder;
    }

    // Cáº¥u hÃ¬nh security: Quáº£n lÃ½ quyá»n truy cáº­p endpoint
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception {
        httpSecurity.authorizeHttpRequests(request -> request
                .requestMatchers(HttpMethod.GET,PUBLIC_GET_ENDPOINTS).permitAll()
                .requestMatchers(HttpMethod.POST, PUBLIC_POST_ENDPOINTS).permitAll()
                .anyRequest()
                .authenticated()); // Táº¥t cáº£ request khÃ¡c Ä‘á» buá»™c pháº£i cÃ³ JWT há»£p lá»‡

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
                        ::disable); // Táº¯t CSRF, thÆ°á»ng lÃ m vá»›i REST API vÃ¬ khÃ´ng cáº§n báº£o vá»‡ form nhÆ° web app

        return httpSecurity.build();
    }

    // Cáº¥u hÃ¬nh CORS cho API
    @Bean
    public CorsFilter corsFilter() { 
        CorsConfiguration corsConfiguration = new CorsConfiguration();

        // Cáº¥u hÃ¬nh core
        corsConfiguration.addAllowedOrigin("*"); // Cho web truy cáº­p API nÃ y vÃ o nhá»¯ng trang web nÃ o
        corsConfiguration.addAllowedMethod("*"); // Cho phÃ©p method nÃ o Ä‘Æ°á»£c gá»i tá»« origin nÃ y
        corsConfiguration.addAllowedHeader("*"); // Cho phÃ©p táº¥t cáº£ header Ä‘Æ°á»£c truy cáº­p

        UrlBasedCorsConfigurationSource urlBasedCorsConfigurationSource = new UrlBasedCorsConfigurationSource();
        urlBasedCorsConfigurationSource.registerCorsConfiguration("/**", corsConfiguration);

        return new CorsFilter(urlBasedCorsConfigurationSource);
    }

    // Customize authority mapper cho converter
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter jwtGrantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        jwtGrantedAuthoritiesConverter.setAuthorityPrefix("");

        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(jwtGrantedAuthoritiesConverter);

        return jwtAuthenticationConverter;
    }

    // MÃ£ hÃ³a máº­t kháº©u
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
