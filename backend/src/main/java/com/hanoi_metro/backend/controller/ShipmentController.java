package com.hanoi_metro.backend.controller;

import org.springframework.web.bind.annotation.*;

import com.hanoi_metro.backend.dto.request.ApiResponse;
import com.hanoi_metro.backend.dto.response.ShipmentResponse;
import com.hanoi_metro.backend.service.ShipmentService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/shipments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShipmentController {
    ShipmentService shipmentService;

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
}
