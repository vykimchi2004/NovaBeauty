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

    PromotionResponse toResponse(Promotion promotion);

    // Request to Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", source = "code")
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
    @Mapping(target = "usageLimit", source = "usageLimit")
    void updatePromotion(@MappingTarget Promotion promotion, PromotionUpdateRequest request);

    @Named("mapCategoryListToIds")
    default Set<String> mapCategoryListToIds(Set<Category> categories) {
        if (categories == null) return null;
        return categories.stream().map(Category::getId).collect(Collectors.toSet());
    }

    @Named("mapCategoryListToNames")
    default List<String> mapCategoryListToNames(Set<Category> categories) {
        if (categories == null) return null;
        return categories.stream().map(Category::getName).filter(name -> name != null && !name.isBlank()).collect(Collectors.toList());
    }

    @Named("mapProductListToIds")
    default Set<String> mapProductListToIds(Set<Product> products) {
        if (products == null) return null;
        return products.stream().map(Product::getId).collect(Collectors.toSet());
    }

    @Named("mapProductListToNames")
    default List<String> mapProductListToNames(Set<Product> products) {
        if (products == null)
            return null;
        return products.stream().map(Product::getName)
                .filter(name -> name != null && !name.isBlank()).collect(Collectors.toList());
    }
}
