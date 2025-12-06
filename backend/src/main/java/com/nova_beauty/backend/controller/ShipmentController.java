package com.nova_beauty.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.request.CreateShipmentRequest;
import com.nova_beauty.backend.dto.request.GhnCalculateFeeRequest;
import com.nova_beauty.backend.dto.request.GhnLeadtimeRequest;
import com.nova_beauty.backend.dto.response.GhnDistrictResponse;
import com.nova_beauty.backend.dto.response.GhnFeeResponse;
import com.nova_beauty.backend.dto.response.GhnLeadtimeResponse;
import com.nova_beauty.backend.dto.response.GhnPickShiftResponse;
import com.nova_beauty.backend.dto.response.GhnProvinceResponse;
import com.nova_beauty.backend.dto.response.GhnShipmentDataResponse;
import com.nova_beauty.backend.dto.response.GhnWardResponse;
import com.nova_beauty.backend.dto.response.ShipmentResponse;
import com.nova_beauty.backend.service.ShipmentService;
import com.nova_beauty.backend.util.ParseUtil;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/shipments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShipmentController {
    ShipmentService shipmentService;

    // GHN master data
    @GetMapping("/ghn/provinces")
    public ApiResponse<List<GhnProvinceResponse>> getProvinces() {
        return ApiResponse.<List<GhnProvinceResponse>>builder()
                .result(shipmentService.getProvinces())
                .build();
    }

    @GetMapping("/ghn/districts")
    public ApiResponse<List<GhnDistrictResponse>> getDistricts(@RequestParam("province_id") String provinceId) {
        Integer parsed = ParseUtil.parseInteger(provinceId, "province_id");
        return ApiResponse.<List<GhnDistrictResponse>>builder()
                .result(shipmentService.getDistricts(parsed))
                .build();
    }

    @GetMapping("/ghn/wards")
    public ApiResponse<List<GhnWardResponse>> getWards(@RequestParam("district_id") String districtId) {
        Integer parsed = ParseUtil.parseInteger(districtId, "district_id");
        return ApiResponse.<List<GhnWardResponse>>builder()
                .result(shipmentService.getWards(parsed))
                .build();
    }

    @PostMapping("/ghn/fees")
    public ApiResponse<GhnFeeResponse> calculateGenericFee(@RequestBody GhnCalculateFeeRequest request) {
        return ApiResponse.<GhnFeeResponse>builder()
                .result(shipmentService.calculateShippingFee(request))
                .build();
    }

    @PostMapping("/ghn/leadtime")
    public ApiResponse<GhnLeadtimeResponse> calculateLeadtime(@RequestBody GhnLeadtimeRequest request) {
        return ApiResponse.<GhnLeadtimeResponse>builder()
                .result(shipmentService.getLeadtime(request))
                .build();
    }

    // Lấy danh sách ca lấy hàng (pick shifts).
    @GetMapping("/pick-shifts")
    public ApiResponse<List<GhnPickShiftResponse>> getPickShifts() {
        return ApiResponse.<List<GhnPickShiftResponse>>builder()
                .result(shipmentService.getPickShifts())
                .build();
    }

    // Tính phí vận chuyển cho đơn hàng.
    @GetMapping("/calculate-fee/{orderId}")
    public ApiResponse<GhnFeeResponse> calculateShippingFee(@PathVariable String orderId) {
        return ApiResponse.<GhnFeeResponse>builder()
                .result(shipmentService.calculateShippingFee(orderId))
                .build();
    }

    // Tính thời gian giao hàng dự kiến.
    @GetMapping("/leadtime/{orderId}")
    public ApiResponse<GhnLeadtimeResponse> getLeadtime(@PathVariable String orderId) {
        return ApiResponse.<GhnLeadtimeResponse>builder()
                .result(shipmentService.getLeadtime(orderId))
                .build();
    }

    // Xem thông tin trả về của đơn hàng trước khi tạo (preview).
    @PostMapping("/preview/{orderId}")
    public ApiResponse<GhnShipmentDataResponse> previewOrder(
            @PathVariable String orderId,
            @RequestBody(required = false) CreateShipmentRequest request) {
        List<Integer> pickShiftIds = request != null ? request.getPickShiftIds() : null;
        return ApiResponse.<GhnShipmentDataResponse>builder()
                .result(shipmentService.previewOrder(orderId, pickShiftIds))
                .build();
    }

    // Tạo đơn hàng GHN từ Order.
    @PostMapping("/create/{orderId}")
    public ApiResponse<ShipmentResponse> createGhnShipment(
            @PathVariable String orderId,
            @RequestBody(required = false) CreateShipmentRequest request) {
        List<Integer> pickShiftIds = request != null ? request.getPickShiftIds() : null;
        return ApiResponse.<ShipmentResponse>builder()
                .result(shipmentService.createGhnOrder(orderId, pickShiftIds))
                .build();
    }

    // Lấy thông tin shipment theo order ID.
    @GetMapping("/order/{orderId}")
    public ApiResponse<ShipmentResponse> getShipmentByOrderId(@PathVariable String orderId) {
        return ApiResponse.<ShipmentResponse>builder()
                .result(shipmentService.getShipmentByOrderId(orderId))
                .build();
    }

    // Lấy thông tin shipment theo GHN order code.
    @GetMapping("/ghn-code/{orderCode}")
    public ApiResponse<ShipmentResponse> getShipmentByOrderCode(@PathVariable String orderCode) {
        return ApiResponse.<ShipmentResponse>builder()
                .result(shipmentService.getShipmentByOrderCode(orderCode))
                .build();
    }

    // Đồng bộ trạng thái đơn hàng từ GHN API (manual sync).
    @PostMapping("/sync-status/{orderId}")
    public ApiResponse<String> syncOrderStatusFromGhn(@PathVariable String orderId) {
        shipmentService.syncOrderStatusFromGhn(orderId);
        return ApiResponse.<String>builder()
                .result("Đã đồng bộ trạng thái từ GHN thành công")
                .message("Đã cập nhật trạng thái đơn hàng từ GHN")
                .build();
    }
}
