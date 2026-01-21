package com.hanoi_metro.backend.configuration;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "ghn")
public class GhnProperties {
    private String token;
    private Integer shopId;
    private String baseUrl;

    @PostConstruct
    public void validate() {
        log.info("GHN Configuration:");
        log.info("  Base URL: {}", baseUrl);
        log.info("  Token: {}", token != null && !token.isEmpty() ? "***" + token.substring(Math.max(0, token.length() - 4)) : "NOT SET");
        log.info("  Shop ID: {}", shopId);
        
        if (token == null || token.isEmpty() || "change-me".equals(token)) {
            log.warn("⚠️ GHN_TOKEN chưa được cấu hình! Vui lòng set environment variable GHN_TOKEN");
        }
        if (shopId == null || shopId == 0) {
            log.warn("⚠️ GHN_SHOP_ID chưa được cấu hình! Vui lòng set environment variable GHN_SHOP_ID");
        }
    }
}
