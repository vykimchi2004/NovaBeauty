package com.nova_beauty.backend.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.response.CartResponse;
import com.nova_beauty.backend.mapper.CartMapper;
import com.nova_beauty.backend.service.CartService;

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
}
