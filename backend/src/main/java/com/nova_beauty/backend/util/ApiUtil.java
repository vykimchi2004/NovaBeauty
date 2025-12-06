package com.nova_beauty.backend.util;

import java.util.function.Consumer;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import com.nova_beauty.backend.dto.response.GhnApiResponse;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ApiUtil {
    WebClient ghnWebClient;
    static ObjectMapper objectMapper = new ObjectMapper();

    public ApiUtil(@Qualifier("ghnWebClient") WebClient ghnWebClient) {
        this.ghnWebClient = ghnWebClient;
    }

    // =============================== GHN API ===============================

    public <T> T callGhnApi(
            String path,
            HttpMethod method,
            Object payload,
            ParameterizedTypeReference<GhnApiResponse<T>> responseType,
            String token,
            Integer shopId) {
        try {
            GhnApiResponse<T> response = executeGhnRequest(path, method, payload, responseType, token, shopId);

            if (response == null || response.getCode() == null || response.getCode() != 200) {
                String errorMsg = response != null ? response.getMessage() : "Null response from GHN";
                log.error("GHN API error [{} {}]: Code={}, Message={}", 
                    method, path, 
                    response != null ? response.getCode() : "null", 
                    errorMsg);
                throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR, 
                    "Lỗi GHN: " + errorMsg + ". Vui lòng kiểm tra cấu hình GHN_TOKEN và GHN_SHOP_ID.");
            }

            return response.getData();
        } catch (AppException e) {
            // Re-throw AppException để giữ nguyên error message
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error calling GHN API [{} {}]: {}", method, path, e.getMessage(), e);
            String errorDetail = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR, 
                "Lỗi kết nối dịch vụ GHN: " + errorDetail + ". Vui lòng kiểm tra cấu hình và kết nối mạng.");
        }
    }

    // Thực hiện request đến GHN API
    private <T> GhnApiResponse<T> executeGhnRequest(
            String path,
            HttpMethod method,
            Object payload,
            ParameterizedTypeReference<GhnApiResponse<T>> responseType,
            String token,
            Integer shopId) {

        WebClient.RequestBodySpec requestSpec = ghnWebClient
                .method(method)
                .uri(path)
                .headers(headers -> configureGhnHeaders(headers, token, shopId));

        WebClient.RequestHeadersSpec<?> headersSpec = payload != null
                ? requestSpec.bodyValue(payload)
                : requestSpec;

        try {
            GhnApiResponse<T> response = headersSpec
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, clientResponse -> {
                        return clientResponse.bodyToMono(String.class)
                                .flatMap(body -> {

                                    // Thử parse response body để lấy error message từ GHN
                                    String errorMessage = "Lỗi kết nối dịch vụ vận chuyển";
                                    try {
                                        GhnApiResponse<?> errorResponse = objectMapper.readValue(body,
                                                new com.fasterxml.jackson.core.type.TypeReference<GhnApiResponse<Object>>() {});
                                        if (errorResponse != null && errorResponse.getMessage() != null && !errorResponse.getMessage().isEmpty()) {
                                            errorMessage = errorResponse.getMessage();
                                        }
                                    } catch (Exception e) {
                                        log.warn("Could not parse GHN error response: {}", e.getMessage());
                                        // Nếu không parse được, dùng body trực tiếp nếu có (giới hạn độ dài)
                                        if (body != null && !body.isEmpty() && body.length() < 500) {
                                            errorMessage = "Lỗi từ GHN: " + body;
                                        }
                                    }

                                    return Mono.error(new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR, errorMessage));
                                });
                    })
                    .bodyToMono(responseType)
                    .block();

            return response;
        } catch (AppException e) {
            // Re-throw AppException để giữ nguyên error message
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error calling GHN API [{} {}]: {}", method, path, e.getMessage(), e);
            throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR, "Lỗi kết nối dịch vụ vận chuyển: " + e.getMessage());
        }
    }

    private void configureGhnHeaders(HttpHeaders headers, String token, Integer shopId) {
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Token", token);
        headers.set("ShopId", String.valueOf(shopId));
    }

    // =============================== Generic API (for future use) ===============================

    public <T> T callApi(
            String path,
            HttpMethod method,
            Object payload,
            ParameterizedTypeReference<T> responseType,
            Consumer<HttpHeaders> headersConfigurator,
            WebClient webClient) {
        try {
            WebClient.RequestBodySpec requestSpec = webClient
                    .method(method)
                    .uri(path)
                    .headers(headersConfigurator);

            WebClient.RequestHeadersSpec<?> headersSpec = payload != null
                    ? requestSpec.bodyValue(payload)
                    : requestSpec;

            return headersSpec
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, clientResponse -> clientResponse.bodyToMono(String.class)
                            .flatMap(body -> {
                                log.error("API HTTP error {} - {}", clientResponse.statusCode(), body);
                                return Mono.error(new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR));
                            }))
                    .bodyToMono(responseType)
                    .block();
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error calling API [{} {}]", method, path, e);
            throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR);
        }
    }

    // Serialize payload thành chuỗi JSON
    private String serialize(Object payload) {
        if (payload == null) {
            return "null";
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            return payload.toString();
        }
    }
}

