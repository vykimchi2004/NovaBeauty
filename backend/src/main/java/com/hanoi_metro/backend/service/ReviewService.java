package com.hanoi_metro.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hanoi_metro.backend.dto.request.ReviewCreationRequest;
import com.hanoi_metro.backend.dto.request.ReviewReplyRequest;
import com.hanoi_metro.backend.dto.response.ReviewResponse;
import com.hanoi_metro.backend.entity.Order;
import com.hanoi_metro.backend.entity.OrderItem;
import com.hanoi_metro.backend.entity.Product;
import com.hanoi_metro.backend.entity.Review;
import com.hanoi_metro.backend.entity.User;
import com.hanoi_metro.backend.exception.AppException;
import com.hanoi_metro.backend.exception.ErrorCode;
import com.hanoi_metro.backend.mapper.ReviewMapper;
import com.hanoi_metro.backend.mapper.UserMapper;
import com.hanoi_metro.backend.repository.OrderItemRepository;
import com.hanoi_metro.backend.repository.OrderRepository;
import com.hanoi_metro.backend.repository.ProductRepository;
import com.hanoi_metro.backend.repository.ReviewRepository;
import com.hanoi_metro.backend.repository.UserRepository;
import com.hanoi_metro.backend.enums.OrderStatus;

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
    OrderRepository orderRepository;
    OrderItemRepository orderItemRepository;
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
        // Get current user from security context - giống LuminaBook
        // JWT token subject contains email, not userId
        var context = SecurityContextHolder.getContext();
        String userEmail = context.getAuthentication().getName();

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

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
        // Get current user from security context - giống LuminaBook
        // JWT token subject contains email, not userId
        var context = SecurityContextHolder.getContext();
        String userEmail = context.getAuthentication().getName();

        // Get user by email (JWT token subject contains email, not userId) - giống LuminaBook
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Kiểm tra orderItemId có trong request
        String orderItemId = request.getOrderItemId();
        if (orderItemId == null || orderItemId.trim().isEmpty()) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "OrderItem ID không được để trống");
        }

        // Lấy OrderItem
        OrderItem orderItem = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "OrderItem không tồn tại"));

        // Kiểm tra OrderItem thuộc về user hiện tại
        Order order = orderItem.getOrder();
        if (order == null || !order.getUser().getId().equals(user.getId())) {
            throw new AppException(ErrorCode.REVIEW_NOT_PURCHASED, "Bạn không có quyền đánh giá đơn hàng này");
        }

        // Kiểm tra đơn hàng đã được giao (DELIVERED) chưa
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new AppException(ErrorCode.REVIEW_NOT_PURCHASED, "Chỉ có thể đánh giá sau khi đơn hàng đã được giao");
        }

        // Kiểm tra orderItem này đã được đánh giá chưa (mỗi đơn hàng chỉ đánh giá 1 lần)
        boolean alreadyReviewed = reviewRepository.existsByOrderItemId(orderItemId);
        if (alreadyReviewed) {
            throw new AppException(ErrorCode.REVIEW_ALREADY_EXISTS);
        }

        // Lấy Product từ OrderItem
        Product product = orderItem.getProduct();
        if (product == null) {
            throw new AppException(ErrorCode.PRODUCT_NOT_EXISTED);
        }

        // Create review entity using mapper
        Review review = reviewMapper.toReview(request);
        review.setNameDisplay(request.getNameDisplay());
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setCreatedAt(LocalDateTime.now());
        review.setUser(user);
        review.setProduct(product);
        review.setOrderItem(orderItem); // Liên kết với OrderItem cụ thể

        Review savedReview = reviewRepository.save(review);
        log.info("Review created with ID: {} by user: {} (display name: {})", 
            savedReview.getId(), userEmail, request.getNameDisplay());

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
