package com.hanoi_metro.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hanoi_metro.backend.dto.request.ReviewCreationRequest;
import com.hanoi_metro.backend.dto.response.ReviewResponse;
import com.hanoi_metro.backend.entity.Review;

@Mapper(componentModel = "spring")
public interface ReviewMapper {

    // Entity to Response
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userName", source = "user.fullName")
    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productName", source = "product.name")
    @Mapping(target = "orderItemId", source = "orderItem.id")
    ReviewResponse toReviewResponse(Review review);

    // Request to Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "replyAt", ignore = true)
    @Mapping(target = "reply", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "product", ignore = true)
    @Mapping(target = "orderItem", ignore = true)
    Review toReview(ReviewCreationRequest request);
}
