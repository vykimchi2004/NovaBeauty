package com.nova_beauty.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.request.CategoryCreationRequest;
import com.nova_beauty.backend.dto.request.CategoryUpdateRequest;
import com.nova_beauty.backend.dto.response.CategoryResponse;
import com.nova_beauty.backend.service.CategoryService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CategoryController {

    CategoryService categoryService;

    @PostMapping
    ApiResponse<CategoryResponse> createCategory(@RequestBody @Valid CategoryCreationRequest request) {
        log.info("Controller: create Category");
        return ApiResponse.<CategoryResponse>builder()
                .result(categoryService.createCategory(request))
                .build();
    }

    @GetMapping
    ApiResponse<List<CategoryResponse>> getAllCategories() {
        return ApiResponse.<List<CategoryResponse>>builder()
                .result(categoryService.getAllCategories())
                .build();
    }

    @GetMapping("/root")
    ApiResponse<List<CategoryResponse>> getRootCategories() {
        return ApiResponse.<List<CategoryResponse>>builder()
                .result(categoryService.getRootCategories())
                .build();
    }

    @GetMapping("/{parentId}/subcategories")
    ApiResponse<List<CategoryResponse>> getSubCategories(@PathVariable String parentId) {
        return ApiResponse.<List<CategoryResponse>>builder()
                .result(categoryService.getSubCategories(parentId))
                .build();
    }

    @GetMapping("/active")
    ApiResponse<List<CategoryResponse>> getActiveCategories() {
        return ApiResponse.<List<CategoryResponse>>builder()
                .result(categoryService.getActiveCategories())
                .build();
    }

    @GetMapping("/{categoryId}")
    ApiResponse<CategoryResponse> getCategoryById(@PathVariable String categoryId) {
        return ApiResponse.<CategoryResponse>builder()
                .result(categoryService.getCategoryById(categoryId))
                .build();
    }

    @PutMapping("/{categoryId}")
    ApiResponse<CategoryResponse> updateCategory(
            @PathVariable String categoryId, @RequestBody @Valid CategoryUpdateRequest request) {
        return ApiResponse.<CategoryResponse>builder()
                .result(categoryService.updateCategory(categoryId, request))
                .build();
    }

    @DeleteMapping("/{categoryId}")
    ApiResponse<String> deleteCategory(@PathVariable String categoryId) {
        categoryService.deleteCategory(categoryId);
        return ApiResponse.<String>builder().result("Category has been deleted").build();
    }
}
