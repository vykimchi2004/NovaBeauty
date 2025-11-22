package com.nova_beauty.backend.service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.nova_beauty.backend.configuration.GhnProperties;
import com.nova_beauty.backend.dto.request.GhnShippingFeeRequest;
import com.nova_beauty.backend.dto.response.GhnApiResponse;
import com.nova_beauty.backend.dto.response.GhnDistrictResponse;
import com.nova_beauty.backend.dto.response.GhnProvinceResponse;
import com.nova_beauty.backend.dto.response.GhnWardResponse;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
@Slf4j
public class GhnService {
    private final GhnProperties ghnProperties;
    private final WebClient ghnWebClient;

    public List<GhnProvinceResponse> getProvinces() {
        try {
            log.info("Fetching GHN provinces from: {}", ghnProperties.getBaseUrl());
            GhnProvinceResponse[] data = callGhnApi(
                    "/shiip/public-api/master-data/province",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<GhnApiResponse<GhnProvinceResponse[]>>() {});

            return data == null ? List.of() : Arrays.asList(data);
        } catch (AppException e) {
            log.error("Failed to fetch GHN provinces: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error fetching GHN provinces", e);
            throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR);
        }
    }

    public List<GhnDistrictResponse> getDistricts(Integer provinceId) {
        GhnDistrictResponse[] data = callGhnApi(
                "/shiip/public-api/master-data/district",
                HttpMethod.POST,
                Map.of("province_id", provinceId),
                new ParameterizedTypeReference<GhnApiResponse<GhnDistrictResponse[]>>() {});

        return data == null ? List.of() : Arrays.asList(data);
    }

    public List<GhnWardResponse> getWards(Integer districtId) {
        GhnWardResponse[] data = callGhnApi(
                "/shiip/public-api/master-data/ward",
                HttpMethod.POST,
                Map.of("district_id", districtId),
                new ParameterizedTypeReference<GhnApiResponse<GhnWardResponse[]>>() {});

        return data == null ? List.of() : Arrays.asList(data);
    }

    public Object calculateShippingFee(GhnShippingFeeRequest request) {
        return callGhnApi(
                "/shiip/public-api/v2/shipping-order/fee",
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<GhnApiResponse<Object>>() {});
    }

    private <T> T callGhnApi(
            String path,
            HttpMethod method,
            Object payload,
            ParameterizedTypeReference<GhnApiResponse<T>> responseType) {
        try {
            GhnApiResponse<T> response = executeRequest(path, method, payload, responseType);

            if (response == null || response.getCode() == null || response.getCode() != 200) {
                log.error("GHN API error: {}", response != null ? response.getMessage() : "Null response");
                throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR);
            }

            return response.getData();
        } catch (AppException ex) {
            throw ex;
        } catch (Exception e) {
            log.error("Error calling GHN API [{} {}]", method, path, e);
            throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR);
        }
    }

    private <T> GhnApiResponse<T> executeRequest(
            String path,
            HttpMethod method,
            Object payload,
            ParameterizedTypeReference<GhnApiResponse<T>> responseType) {

        WebClient.RequestBodySpec requestSpec = ghnWebClient
                .method(method)
                .uri(path)
                .headers(this::applyDefaultHeaders);

        WebClient.RequestHeadersSpec<?> headersSpec = payload != null
                ? requestSpec.bodyValue(payload)
                : requestSpec;

        return headersSpec
                .retrieve() // bắt đầu gửi request và nhận response
                .onStatus(HttpStatusCode::isError, clientResponse -> clientResponse.bodyToMono(String.class)
                        .flatMap(body -> {
                            log.error("GHN API HTTP error {} - {}", clientResponse.statusCode(), body);
                            return Mono.error(new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR));
                        }))
                .bodyToMono(responseType)
                .block();
    }

    private void applyDefaultHeaders(HttpHeaders headers) {
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Token", ghnProperties.getToken());
        headers.set("ShopId", String.valueOf(ghnProperties.getShopId()));
    }
}

