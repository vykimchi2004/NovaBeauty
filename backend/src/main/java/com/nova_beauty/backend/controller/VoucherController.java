package com.nova_beauty.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.request.ApproveVoucherRequest;
import com.nova_beauty.backend.dto.request.VoucherCreationRequest;
import com.nova_beauty.backend.dto.request.VoucherUpdateRequest;
import com.nova_beauty.backend.dto.response.VoucherResponse;
import com.nova_beauty.backend.enums.VoucherStatus;
import com.nova_beauty.backend.service.VoucherService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/vouchers")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class VoucherController {

    VoucherService voucherService;

    // Staff endpoints
    @PostMapping
    public ApiResponse<VoucherResponse> createVoucher(@RequestBody @Valid VoucherCreationRequest request) {
        // log.info("Controller: create voucher");
        return ApiResponse.<VoucherResponse>builder()
                .result(voucherService.createVoucher(request))
                .build();
    }

    @GetMapping("/my")
    public ApiResponse<List<VoucherResponse>> getMyVouchers() {
        // log.info("Controller: get my vouchers");
        return ApiResponse.<List<VoucherResponse>>builder()
                .result(voucherService.getMyVouchers())
                .build();
    }

    @GetMapping("/{voucherId}")
    public ApiResponse<VoucherResponse> getVoucherById(@PathVariable String voucherId) {
        return ApiResponse.<VoucherResponse>builder()
                .result(voucherService.getVoucherById(voucherId))
                .build();
    }

    @PutMapping("/{voucherId}")
    public ApiResponse<VoucherResponse> updateVoucher(
            @PathVariable String voucherId, @RequestBody @Valid VoucherUpdateRequest request) {
        return ApiResponse.<VoucherResponse>builder()
                .result(voucherService.updateVoucher(voucherId, request))
                .build();
    }

    @DeleteMapping("/{voucherId}")
    public ApiResponse<String> deleteVoucher(@PathVariable String voucherId) {
        voucherService.deleteVoucher(voucherId);
        return ApiResponse.<String>builder()
                .result("Voucher has been deleted")
                .build();
    }

    // Admin endpoints
    @GetMapping("/pending")
    public ApiResponse<List<VoucherResponse>> getPendingVouchers() {
        return ApiResponse.<List<VoucherResponse>>builder()
                .result(voucherService.getPendingVouchers())
                .build();
    }

    @PostMapping("/approve")
    public ApiResponse<VoucherResponse> approveVoucher(@RequestBody @Valid ApproveVoucherRequest request) {
        return ApiResponse.<VoucherResponse>builder()
                .result(voucherService.approveVoucher(request))
                .build();
    }

    @GetMapping("/status/{status}")
    public ApiResponse<List<VoucherResponse>> getVouchersByStatus(@PathVariable VoucherStatus status) {
        return ApiResponse.<List<VoucherResponse>>builder()
                .result(voucherService.getVouchersByStatus(status))
                .build();
    }

    // Public endpoints
    @GetMapping("/active")
    public ApiResponse<List<VoucherResponse>> getActiveVouchers() {
        return ApiResponse.<List<VoucherResponse>>builder()
                .result(voucherService.getActiveVouchers())
                .build();
    }
}
