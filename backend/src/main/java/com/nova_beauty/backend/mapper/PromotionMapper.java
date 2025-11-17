package com.nova_beauty.backend.mapper;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.nova_beauty.backend.dto.request.PromotionCreationRequest;
import com.nova_beauty.backend.dto.request.PromotionUpdateRequest;
import com.nova_beauty.backend.dto.response.PromotionResponse;
import com.nova_beauty.backend.entity.Category;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.Promotion;

@Mapper(componentModel = "spring")
public interface PromotionMapper {

    // Entity to Response
    @Mapping(target = "submittedBy", source = "submittedBy.id")
    @Mapping(target = "submittedByName", source = "submittedBy.fullName")
    @Mapping(target = "approvedBy", source = "approvedBy.id")
    @Mapping(target = "approvedByName", source = "approvedBy.fullName")
    @Mapping(target = "categoryIds", source = "categoryApply", qualifiedByName = "mapCategoryListToIds")
    @Mapping(target = "categoryNames", source = "categoryApply", qualifiedByName = "mapCategoryListToNames")
    @Mapping(target = "productIds", source = "productApply", qualifiedByName = "mapProductListToIds")
    @Mapping(target = "productNames", source = "productApply", qualifiedByName = "mapProductListToNames")
    @Mapping(target = "imageUrl", source = "imageUrl", qualifiedByName = "normalizeImageUrl")
    PromotionResponse toResponse(Promotion promotion);

    // Request to Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "submittedBy", ignore = true)
    @Mapping(target = "approvedBy", ignore = true)
    @Mapping(target = "submittedAt", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "rejectionReason", ignore = true)
    @Mapping(target = "usageCount", ignore = true)
    @Mapping(target = "isActive", ignore = true)
    @Mapping(target = "categoryApply", ignore = true)
    @Mapping(target = "productApply", ignore = true)
    Promotion toPromotion(PromotionCreationRequest request);

    // Update Entity
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "submittedBy", ignore = true)
    @Mapping(target = "approvedBy", ignore = true)
    @Mapping(target = "submittedAt", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "rejectionReason", ignore = true)
    @Mapping(target = "usageCount", ignore = true)
    @Mapping(target = "isActive", ignore = true)
    @Mapping(target = "categoryApply", ignore = true)
    @Mapping(target = "productApply", ignore = true)
    void updatePromotion(@MappingTarget Promotion promotion, PromotionUpdateRequest request);

    @Named("mapCategoryListToIds")
    default Set<String> mapCategoryListToIds(Set<Category> categories) {
        if (categories == null) return null;
        return categories.stream().map(Category::getId).collect(Collectors.toSet());
    }

    @Named("mapCategoryListToNames")
    default List<String> mapCategoryListToNames(Set<Category> categories) {
        if (categories == null) return null;
        return categories.stream()
                .map(Category::getName)
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.toList());
    }

    @Named("mapProductListToIds")
    default Set<String> mapProductListToIds(Set<Product> products) {
        if (products == null) return null;
        return products.stream().map(Product::getId).collect(Collectors.toSet());
    }

    @Named("mapProductListToNames")
    default List<String> mapProductListToNames(Set<Product> products) {
        if (products == null) return null;
        return products.stream()
                .map(Product::getName)
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.toList());
    }

    @Named("normalizeImageUrl")
    default String normalizeImageUrl(String url) {
        if (url == null || url.isBlank()) return url;
        String lower = url.toLowerCase();
        if (lower.startsWith("http://") || lower.startsWith("https://")) {
            return replaceLegacyPromotionPath(url);
        }
        if (url.startsWith("/promotion_media")) {
            String base = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
            return base + url;
        }
        if (url.startsWith("/promotions")) {
            String base = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
            String converted = url.replaceFirst("/promotions", "/promotion_media");
            return base + converted;
        }
        String base = ServletUriComponentsBuilder.fromCurrentContextPath().path("/promotion_media/").build().toUriString();
        if (base.endsWith("/")) return base + url;
        return base + "/" + url;
    }

    private String replaceLegacyPromotionPath(String url) {
        if (url == null) return null;
        if (url.contains("/promotions/") && !url.contains("/promotion_media/")) {
            return url.replace("/promotions/", "/promotion_media/");
        }
        if (url.contains("/nova_beauty/")) {
            return url.replace("/nova_beauty/", "/nova_beauty/promotion_media/");
        }
        return url;
    }
}
