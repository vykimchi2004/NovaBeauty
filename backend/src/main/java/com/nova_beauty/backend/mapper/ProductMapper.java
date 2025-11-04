package com.nova_beauty.backend.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import com.nova_beauty.backend.dto.request.ProductCreationRequest;
import com.nova_beauty.backend.dto.request.ProductUpdateRequest;
import com.nova_beauty.backend.dto.response.ProductResponse;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.ProductMedia;
import com.nova_beauty.backend.entity.Review;

@Mapper(componentModel = "spring")
public interface ProductMapper {

    // Entity to Response
    @Mapping(target = "submittedBy", source = "submittedBy.id")
    @Mapping(target = "submittedByName", source = "submittedBy.fullName")
    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "mediaUrls", source = "mediaList", qualifiedByName = "mapMediaUrls")
    @Mapping(target = "defaultMediaUrl", source = "defaultMedia.mediaUrl")
    @Mapping(target = "reviewCount", source = "reviews", qualifiedByName = "mapReviewCount")
    @Mapping(target = "averageRating", source = "reviews", qualifiedByName = "mapAverageRating")
    @Mapping(target = "availableQuantity", source = "inventory.stockQuantity")
    ProductResponse toResponse(Product product);

    // Request to Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "submittedBy", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "mediaList", ignore = true)
    @Mapping(target = "defaultMedia", ignore = true)
    @Mapping(target = "reviews", ignore = true)
    @Mapping(target = "inventory", ignore = true)
    @Mapping(target = "banners", ignore = true)
    @Mapping(target = "quantitySold", ignore = true)
    Product toProduct(ProductCreationRequest request);

    // Update Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "submittedBy", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "mediaList", ignore = true)
    @Mapping(target = "defaultMedia", ignore = true)
    @Mapping(target = "reviews", ignore = true)
    @Mapping(target = "inventory", ignore = true)
    @Mapping(target = "banners", ignore = true)
    @Mapping(target = "quantitySold", ignore = true)
    void updateProduct(@MappingTarget Product product, ProductUpdateRequest request);

    @Named("mapMediaUrls")
    default List<String> mapMediaUrls(List<ProductMedia> mediaList) {
        if (mediaList == null) return null;
        return mediaList.stream().map(ProductMedia::getMediaUrl).toList();
    }

    @Named("mapReviewCount")
    default Integer mapReviewCount(List<Review> reviews) {
        return reviews != null ? reviews.size() : 0;
    }

    @Named("mapAverageRating")
    default Double mapAverageRating(List<Review> reviews) {
        if (reviews == null || reviews.isEmpty()) return 0.0;
        return reviews.stream().mapToDouble(Review::getRating).average().orElse(0.0);
    }
}
