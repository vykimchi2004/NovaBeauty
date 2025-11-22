package com.nova_beauty.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.request.GhnShippingFeeRequest;
import com.nova_beauty.backend.dto.response.GhnDistrictResponse;
import com.nova_beauty.backend.dto.response.GhnProvinceResponse;
import com.nova_beauty.backend.dto.response.GhnWardResponse;
import com.nova_beauty.backend.service.GhnService;
import com.nova_beauty.backend.util.ParseUtil;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/ghn")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class GhnController {
    GhnService ghnService;

    @GetMapping("/provinces")
    public ApiResponse<List<GhnProvinceResponse>> getProvinces() {
        log.info("Getting GHN provinces");
        return ApiResponse.<List<GhnProvinceResponse>>builder()
                .result(ghnService.getProvinces())
                .build();
    }

    @GetMapping("/districts")
    public ApiResponse<List<GhnDistrictResponse>> getDistricts(
            @RequestParam("province_id") String provinceIdStr) {
        Integer provinceId = ParseUtil.parseInteger(provinceIdStr, "province_id");
        log.info("Getting GHN districts for province: {}", provinceId);
        return ApiResponse.<List<GhnDistrictResponse>>builder()
                .result(ghnService.getDistricts(provinceId))
                .build();
    }

    @GetMapping("/wards")
    public ApiResponse<List<GhnWardResponse>> getWards(
            @RequestParam("district_id") String districtIdStr) {
        Integer districtId = ParseUtil.parseInteger(districtIdStr, "district_id");
        log.info("Getting GHN wards for district: {}", districtId);
        return ApiResponse.<List<GhnWardResponse>>builder()
                .result(ghnService.getWards(districtId))
                .build();
    }

    @PostMapping("/shipping-fees")
    public ApiResponse<Object> calculateShippingFee(@RequestBody GhnShippingFeeRequest request) {
        log.info("Calculating GHN shipping fee");
        return ApiResponse.<Object>builder()
                .result(ghnService.calculateShippingFee(request))
                .build();
    }
}

