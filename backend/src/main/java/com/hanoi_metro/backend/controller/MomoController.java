package com.hanoi_metro.backend.controller;

import com.hanoi_metro.backend.dto.request.ApiResponse;
import com.hanoi_metro.backend.dto.request.MomoIpnRequest;
import com.hanoi_metro.backend.dto.response.CreateMomoResponse;
import com.hanoi_metro.backend.service.MomoService;
import com.hanoi_metro.backend.service.OrderService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/momo")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class MomoController {

    MomoService momoService;
    OrderService orderService;

    /**
     * API cho frontend tạo giao dịch MoMo.
     * Frontend truyền số tiền (VND) và optional orderId (mã đơn nội bộ).
     */
    @PostMapping("/create")
    public ApiResponse<CreateMomoResponse> createPayment(
            @RequestParam("amount") long amount,
            @RequestParam(value = "orderId", required = false) String orderId) {
        CreateMomoResponse response = momoService.createMomoPayment(amount, orderId);
        return ApiResponse.<CreateMomoResponse>builder()
                .result(response)
                .build();
    }

    /**
     * IPN handler nhận kết quả thanh toán từ MoMo.
     * Hiện tại chỉ log lại, bạn có thể bổ sung xử lý cập nhật trạng thái đơn hàng sau.
     */
    @PostMapping("/ipn-handler")
    public ResponseEntity<Void> handleIpn(@RequestBody MomoIpnRequest request) {
        log.info("Received MoMo IPN payload: {}", request);
        if (!momoService.validateIpnSignature(request)) {
            log.warn("Invalid MoMo IPN signature for order {}", request.getOrderId());
            return ResponseEntity.badRequest().build();
        }
        orderService.handleMomoIpn(request);
        return ResponseEntity.noContent().build();
    }
}

