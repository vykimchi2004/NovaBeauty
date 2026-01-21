package com.hanoi_metro.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hanoi_metro.backend.dto.request.ApiResponse;
import com.hanoi_metro.backend.dto.response.ConfigResponse;

import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/config")
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
public class ConfigController {

    @Value("${server.port:8080}")
    Integer serverPort;

    @Value("${server.servlet.context-path:/}")
    String contextPath;

    @Value("${app.frontend.base-url:}")
    String frontendBaseUrl;

    @Value("${ghn.base-url:https://dev-online-gateway.ghn.vn}")
    String ghnBaseUrl;

    @GetMapping("/api-base-url")
    public ApiResponse<ConfigResponse> getApiBaseUrl() {
        String apiBaseUrl;
        if (frontendBaseUrl != null && !frontendBaseUrl.trim().isEmpty()) {
            apiBaseUrl = frontendBaseUrl.trim();
        } else {
            // Tự động tạo từ request (lấy protocol và host từ request)
            // Hoặc dùng localhost mặc định
            apiBaseUrl = String.format("http://localhost:%d%s", serverPort, contextPath);
        }

        ConfigResponse config = ConfigResponse.builder()
                .apiBaseUrl(apiBaseUrl)
                .ghnBaseUrl(ghnBaseUrl)
                .contextPath(contextPath)
                .port(serverPort)
                .build();

        return ApiResponse.<ConfigResponse>builder()
                .result(config)
                .build();
    }
}

