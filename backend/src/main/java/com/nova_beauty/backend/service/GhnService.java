package com.nova_beauty.backend.service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import com.nova_beauty.backend.constant.ApiConstants;
import com.nova_beauty.backend.dto.response.*;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;

import com.nova_beauty.backend.configuration.GhnProperties;
import com.nova_beauty.backend.dto.response.GhnOrderDetailResponse;
import com.nova_beauty.backend.dto.request.GhnCalculateFeeRequest;
import com.nova_beauty.backend.dto.request.GhnCreateOrderRequest;
import com.nova_beauty.backend.util.ApiUtil;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GhnService {
    GhnProperties ghnProperties;
    ApiUtil apiUtil;

    public List<GhnProvinceResponse> getProvinces() {
        try {
            log.info("Fetching GHN provinces from: {}", ghnProperties.getBaseUrl());
            log.debug("Using GHN Token: {}***, Shop ID: {}", 
                ghnProperties.getToken() != null && ghnProperties.getToken().length() > 4 
                    ? ghnProperties.getToken().substring(0, 4) : "N/A", 
                ghnProperties.getShopId());
            
            GhnProvinceResponse[] data = apiUtil.callGhnApi(
                    ApiConstants.GHN_MASTER_DATA_PROVINCE,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<GhnApiResponse<GhnProvinceResponse[]>>() {},
                    ghnProperties.getToken(),
                    ghnProperties.getShopId());

            if (data == null || data.length == 0) {
                log.warn("GHN returned empty provinces list");
                return List.of();
            }
            
            log.info("Successfully fetched {} provinces from GHN", data.length);
            return Arrays.asList(data);
        } catch (AppException e) {
            log.error("Failed to fetch GHN provinces: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Failed to fetch GHN provinces - Unexpected error", e);
            throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR, 
                "Không thể kết nối đến GHN. Vui lòng kiểm tra cấu hình GHN_TOKEN và GHN_SHOP_ID.");
        }
    }

    public List<GhnDistrictResponse> getDistricts(Integer provinceId) {
        GhnDistrictResponse[] data = apiUtil.callGhnApi(
                ApiConstants.GHN_MASTER_DATA_DISTRICT,
                HttpMethod.POST,
                Map.of("province_id", provinceId),
                new ParameterizedTypeReference<GhnApiResponse<GhnDistrictResponse[]>>() {},
                ghnProperties.getToken(),
                ghnProperties.getShopId());

        return data == null ? List.of() : Arrays.asList(data);
    }

    public List<GhnWardResponse> getWards(Integer districtId) {
        GhnWardResponse[] data = apiUtil.callGhnApi(
                ApiConstants.GHN_MASTER_DATA_WARD,
                HttpMethod.POST,
                Map.of("district_id", districtId),
                new ParameterizedTypeReference<GhnApiResponse<GhnWardResponse[]>>() {},
                ghnProperties.getToken(),
                ghnProperties.getShopId());

        return data == null ? List.of() : Arrays.asList(data);
    }

    public GhnFeeResponse calculateShippingFee(GhnCalculateFeeRequest request) {
        return apiUtil.callGhnApi(
                ApiConstants.GHN_SHIPPING_ORDER_FEE,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<GhnApiResponse<GhnFeeResponse>>() {},
                ghnProperties.getToken(),
                ghnProperties.getShopId());
    }

    public List<GhnPickShiftResponse> getPickShifts() {
        GhnPickShiftResponse[] data = apiUtil.callGhnApi(
                ApiConstants.GHN_SHIFT_DATE,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<GhnApiResponse<GhnPickShiftResponse[]>>() {},
                ghnProperties.getToken(),
                ghnProperties.getShopId());

        return data == null ? List.of() : Arrays.asList(data);
    }

    public GhnLeadtimeResponse getLeadtime(
            Integer fromDistrictId,
            String fromWardCode,
            Integer toDistrictId,
            String toWardCode,
            Integer serviceTypeId) {
        Map<String, Object> payload = Map.of(
                "from_district_id", fromDistrictId,
                "from_ward_code", fromWardCode,
                "to_district_id", toDistrictId,
                "to_ward_code", toWardCode,
                "service_type_id", serviceTypeId);

        return apiUtil.callGhnApi(
                ApiConstants.GHN_SHIPPING_ORDER_LEADTIME,
                HttpMethod.POST,
                payload,
                new ParameterizedTypeReference<GhnApiResponse<GhnLeadtimeResponse>>() {},
                ghnProperties.getToken(),
                ghnProperties.getShopId());
    }

    public GhnShipmentDataResponse previewOrder(GhnCreateOrderRequest request) {
        return apiUtil.callGhnApi(
                ApiConstants.GHN_SHIPPING_ORDER_PREVIEW,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<GhnApiResponse<GhnShipmentDataResponse>>() {},
                ghnProperties.getToken(),
                ghnProperties.getShopId());
    }

    public GhnShipmentDataResponse createOrder(GhnCreateOrderRequest request) {
        return apiUtil.callGhnApi(
                ApiConstants.GHN_SHIPPING_ORDER_CREATE,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<GhnApiResponse<GhnShipmentDataResponse>>() {},
                ghnProperties.getToken(),
                ghnProperties.getShopId());
    }

    public GhnOrderDetailResponse getOrderDetail(String orderCode) {
        Map<String, Object> payload = Map.of("order_code", orderCode);
        return apiUtil.callGhnApi(
                ApiConstants.GHN_SHIPPING_ORDER_DETAIL,
                HttpMethod.POST,
                payload,
                new ParameterizedTypeReference<GhnApiResponse<com.nova_beauty.backend.dto.response.GhnOrderDetailResponse>>() {},
                ghnProperties.getToken(),
                ghnProperties.getShopId());
    }
}
