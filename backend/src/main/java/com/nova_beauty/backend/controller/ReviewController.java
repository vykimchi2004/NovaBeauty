package com.nova_beauty.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.request.ReviewCreationRequest;
import com.nova_beauty.backend.dto.request.ReviewReplyRequest;
import com.nova_beauty.backend.dto.response.ReviewResponse;
import com.nova_beauty.backend.service.ReviewService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ReviewController {

    ReviewService reviewService;

    @GetMapping("/{reviewId}")
    ApiResponse<ReviewResponse> getReviewById(@PathVariable String reviewId) {
        return ApiResponse.<ReviewResponse>builder()
                .result(reviewService.getReviewById(reviewId))
                .build();
    }

    @GetMapping("/product/{productId}")
    ApiResponse<List<ReviewResponse>> getReviewsByProduct(@PathVariable String productId) {
        return ApiResponse.<List<ReviewResponse>>builder()
                .result(reviewService.getReviewsByProduct(productId))
                .build();
    }

    @GetMapping("/my-reviews")
    ApiResponse<List<ReviewResponse>> getMyReviews() {
        return ApiResponse.<List<ReviewResponse>>builder()
                .result(reviewService.getMyReviews())
                .build();
    }

    @GetMapping("/all-reviews")
    ApiResponse<List<ReviewResponse>> getAllReviews() {
        return ApiResponse.<List<ReviewResponse>>builder()
                .result(reviewService.getAllReviews())
                .build();
    }

    @PostMapping
    ApiResponse<ReviewResponse> createReview(@RequestBody @Valid ReviewCreationRequest request) {
        log.info("Controller: create review");
        return ApiResponse.<ReviewResponse>builder()
                .result(reviewService.createReview(request))
                .build();
    }

    @PostMapping("/{reviewId}/reply")
    ApiResponse<ReviewResponse> replyToReview(
            @PathVariable String reviewId, @RequestBody @Valid ReviewReplyRequest request) {
        log.info("Controller: reply to review {}", reviewId);
        return ApiResponse.<ReviewResponse>builder()
                .result(reviewService.replyToReview(reviewId, request))
                .build();
    }

    @DeleteMapping("/{reviewId}")
    ApiResponse<String> deleteReview(@PathVariable String reviewId) {
        reviewService.deleteReview(reviewId);
        return ApiResponse.<String>builder().result("Review has been deleted").build();
    }
}
