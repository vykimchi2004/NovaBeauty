package com.hanoi_metro.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.hanoi_metro.backend.dto.request.ApiResponse;
import com.hanoi_metro.backend.dto.request.ProductCreationRequest;
import com.hanoi_metro.backend.dto.request.ProductUpdateRequest;
import com.hanoi_metro.backend.dto.response.ProductResponse;
import com.hanoi_metro.backend.service.ProductService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

/**
 * Product Controller
 * REST API endpoints cho quáº£n lÃ½ sáº£n pháº©m
 */
@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ProductController {

    ProductService productService;

    // ========== CREATE ENDPOINTS ==========
    @PostMapping
    ApiResponse<ProductResponse> createProduct(@RequestBody @Valid ProductCreationRequest request) {
        log.info("Controller: create Product");
        return ApiResponse.<ProductResponse>builder()
                .result(productService.createProduct(request))
                .build();
    }

    // ========== READ ENDPOINTS ==========
    @GetMapping
    ApiResponse<List<ProductResponse>> getAllProducts() {
        return ApiResponse.<List<ProductResponse>>builder()
                .result(productService.getAllProducts())
                .build();
    }

    @GetMapping("/active")
    ApiResponse<List<ProductResponse>> getActiveProducts() {
        return ApiResponse.<List<ProductResponse>>builder()
                .result(productService.getActiveProducts())
                .build();
    }

    @GetMapping("/{productId}")
    ApiResponse<ProductResponse> getProductById(@PathVariable String productId) {
        return ApiResponse.<ProductResponse>builder()
                .result(productService.getProductById(productId))
                .build();
    }

    @GetMapping("/my-products")
    ApiResponse<List<ProductResponse>> getMyProducts() {
        return ApiResponse.<List<ProductResponse>>builder()
                .result(productService.getMyProducts())
                .build();
    }

    @GetMapping("/pending")
    ApiResponse<List<ProductResponse>> getPendingProducts() {
        return ApiResponse.<List<ProductResponse>>builder()
                .result(productService.getPendingProducts())
                .build();
    }

    @GetMapping("/category/{categoryId}")
    ApiResponse<List<ProductResponse>> getProductsByCategory(@PathVariable String categoryId) {
        return ApiResponse.<List<ProductResponse>>builder()
                .result(productService.getProductsByCategory(categoryId))
                .build();
    }

    @GetMapping("/search")
    ApiResponse<List<ProductResponse>> searchProducts(@RequestParam String keyword) {
        return ApiResponse.<List<ProductResponse>>builder()
                .result(productService.searchProducts(keyword))
                .build();
    }

    @GetMapping("/price-range")
    ApiResponse<List<ProductResponse>> getProductsByPriceRange(
            @RequestParam Double minPrice, @RequestParam Double maxPrice) {
        return ApiResponse.<List<ProductResponse>>builder()
                .result(productService.getProductsByPriceRange(minPrice, maxPrice))
                .build();
    }

    // ========== UPDATE ENDPOINTS ==========
    @PutMapping("/{productId}")
    ApiResponse<ProductResponse> updateProduct(
            @PathVariable String productId, @RequestBody @Valid ProductUpdateRequest request) {
        return ApiResponse.<ProductResponse>builder()
                .result(productService.updateProduct(productId, request))
                .build();
    }

    // Set default media by URL
    @PostMapping("/{productId}/default-media")
    ApiResponse<ProductResponse> setDefaultMedia(
            @PathVariable String productId,
            @RequestParam("mediaUrl") String mediaUrl) {
        return ApiResponse.<ProductResponse>builder()
                .result(productService.setDefaultMedia(productId, mediaUrl))
                .build();
    }

    // ========== DELETE ENDPOINTS ==========
    @DeleteMapping("/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    ApiResponse<String> deleteProduct(@PathVariable String productId) {
        productService.deleteProduct(productId);
        return ApiResponse.<String>builder().result("Product has been deleted").build();
    }
}
