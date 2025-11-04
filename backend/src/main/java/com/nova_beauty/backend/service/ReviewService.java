package com.nova_beauty.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.request.ReviewCreationRequest;
import com.nova_beauty.backend.dto.request.ReviewReplyRequest;
import com.nova_beauty.backend.dto.response.ReviewResponse;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.Review;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.ReviewMapper;
import com.nova_beauty.backend.mapper.UserMapper;
import com.nova_beauty.backend.repository.ProductRepository;
import com.nova_beauty.backend.repository.ReviewRepository;
import com.nova_beauty.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ReviewService {

    ReviewRepository reviewRepository;
    UserRepository userRepository;
    ProductRepository productRepository;
    ReviewMapper reviewMapper;
    private final UserMapper userMapper;

    public ReviewResponse getReviewById(String reviewId) {
        Review review =
                reviewRepository.findById(reviewId).orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_EXISTED));

        return reviewMapper.toReviewResponse(review);
    }

    public List<ReviewResponse> getReviewsByProduct(String productId) {
        List<Review> reviews = reviewRepository.findByProductId(productId);

        return reviews.stream().map(reviewMapper::toReviewResponse).toList();
    }

    public List<ReviewResponse> getMyReviews() {
        // Get current user from security context
        var context = SecurityContextHolder.getContext();
        String userId = context.getAuthentication().getName();

        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<Review> reviews = reviewRepository.findByUserId(user.getId());

        return reviews.stream().map(reviewMapper::toReviewResponse).toList();
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('CUSTOMER_SUPPORT')")
    public List<ReviewResponse> getAllReviews() {
        List<Review> reviews = reviewRepository.findAll();

        return reviews.stream().map(reviewMapper::toReviewResponse).toList();
    }

    @Transactional
    public ReviewResponse createReview(ReviewCreationRequest request) {
        // Get current user from security context
        var context = SecurityContextHolder.getContext();
        String userId = context.getAuthentication().getName();

        // Get user
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Get product
        Product product = productRepository
                .findById(request.getProduct().getId())
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        // Create review entity using mapper
        Review review = reviewMapper.toReview(request);
        review.setNameDisplay(request.getNameDisplay());
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setCreatedAt(LocalDateTime.now());
        review.setUser(user);
        review.setProduct(product);

        Review savedReview = reviewRepository.save(review);
        log.info("Review created with ID: {} by user: {}", savedReview.getId(), userId);

        return reviewMapper.toReviewResponse(savedReview);
    }

    @Transactional
    @PreAuthorize("hasRole('CUSTOMER_SUPPORT')")
    public ReviewResponse replyToReview(String reviewId, ReviewReplyRequest request) {
        // Find the review
        Review review =
                reviewRepository.findById(reviewId).orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_EXISTED));

        // Set reply and reply time
        review.setReply(request.getReply());
        review.setReplyAt(LocalDateTime.now());

        // Save the updated review
        Review savedReview = reviewRepository.save(review);
        log.info("Reply added to review: {} by customer support", reviewId);

        return reviewMapper.toReviewResponse(savedReview);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteReview(String reviewId) {
        Review review =
                reviewRepository.findById(reviewId).orElseThrow(() -> new AppException(ErrorCode.REVIEW_NOT_EXISTED));

        reviewRepository.delete(review);
        log.info("Review deleted: {} by admin", reviewId);
    }
}
