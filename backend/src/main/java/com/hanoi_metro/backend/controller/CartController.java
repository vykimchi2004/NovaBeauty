package com.hanoi_metro.backend.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.hanoi_metro.backend.dto.request.ApiResponse;
import com.hanoi_metro.backend.dto.response.CartResponse;
import com.hanoi_metro.backend.mapper.CartMapper;
import com.hanoi_metro.backend.service.CartService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/cart")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CartController {

    CartService cartService;
    CartMapper cartMapper;

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    ApiResponse<CartResponse> getCart() {
        var cart = cartService.getOrCreateCartForCurrentCustomer();
        return ApiResponse.<CartResponse>builder()
                .result(cartMapper.toResponse(cart))
                .build();
    }

    @PostMapping("/items")
    @PreAuthorize("hasRole('CUSTOMER')")
    ApiResponse<CartResponse> addItem(
            @RequestParam("productId") String productId, 
            @RequestParam("quantity") int quantity,
            @RequestParam(value = "colorCode", required = false) String colorCode) {
        var cart = cartService.addItem(productId, quantity, colorCode);
        return ApiResponse.<CartResponse>builder()
                .result(cartMapper.toResponse(cart))
                .build();
    }

    @PostMapping("/apply-voucher")
    @PreAuthorize("hasRole('CUSTOMER')")
    ApiResponse<CartResponse> applyVoucher(@RequestParam("code") String code) {
        var cart = cartService.applyVoucher(code);
        return ApiResponse.<CartResponse>builder()
                .result(cartMapper.toResponse(cart))
                .build();
    }

    @DeleteMapping("/voucher")
    @PreAuthorize("hasRole('CUSTOMER')")
    ApiResponse<CartResponse> clearVoucher() {
        var cart = cartService.clearVoucher();
        return ApiResponse.<CartResponse>builder()
                .result(cartMapper.toResponse(cart))
                .build();
    }
}
