package com.hanoi_metro.backend.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.hanoi_metro.backend.dto.request.ApiResponse;
import com.hanoi_metro.backend.dto.response.FinancialSummary;
import com.hanoi_metro.backend.dto.response.PaymentRevenue;
import com.hanoi_metro.backend.dto.response.ProductRevenue;
import com.hanoi_metro.backend.dto.response.RevenuePoint;
import com.hanoi_metro.backend.dto.response.RevenueSummary;
import com.hanoi_metro.backend.service.FinancialService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/financial")
@RequiredArgsConstructor
public class FinancialController {

    private final FinancialService financialService;

    @GetMapping("/revenue/day")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<RevenuePoint>> revenueByDay(
            @RequestParam LocalDate start,
            @RequestParam LocalDate end,
            @RequestParam(required = false, defaultValue = "day") String timeMode) {
        return ApiResponse.<List<RevenuePoint>>builder()
                .result(financialService.revenueByDay(start, end, timeMode))
                .build();
    }

    @GetMapping("/revenue/payment")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<PaymentRevenue>> revenueByPayment(
            @RequestParam LocalDate start, @RequestParam LocalDate end) {
        return ApiResponse.<List<PaymentRevenue>>builder()
                .result(financialService.revenueByPayment(start, end))
                .build();
    }

    @GetMapping("/revenue/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<RevenueSummary> revenueSummary(
            @RequestParam LocalDate start, @RequestParam LocalDate end) {
        return ApiResponse.<RevenueSummary>builder()
                .result(financialService.revenueSummary(start, end))
                .build();
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<FinancialSummary> summary(
            @RequestParam LocalDate start, @RequestParam LocalDate end) {
        return ApiResponse.<FinancialSummary>builder()
                .result(financialService.summary(start, end))
                .build();
    }

    @GetMapping("/top-products")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<ProductRevenue>> topProductsByRevenue(
            @RequestParam LocalDate start,
            @RequestParam LocalDate end,
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.<List<ProductRevenue>>builder()
                .result(financialService.topProductsByRevenue(start, end, limit))
                .build();
    }
}
