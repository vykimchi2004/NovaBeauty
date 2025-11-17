package com.nova_beauty.backend.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import com.nova_beauty.backend.dto.request.BannerCreationRequest;
import com.nova_beauty.backend.dto.request.BannerUpdateRequest;
import com.nova_beauty.backend.dto.response.BannerResponse;
import com.nova_beauty.backend.entity.Banner;
import com.nova_beauty.backend.entity.Product;

@Mapper(componentModel = "spring")
public interface BannerMapper {

    // Entity to Response
    @Mapping(target = "createdBy", source = "createdBy.id")
    @Mapping(target = "createdByName", source = "createdBy.fullName")
    @Mapping(target = "productIds", source = "products", qualifiedByName = "mapProductIds")
    @Mapping(target = "productNames", source = "products", qualifiedByName = "mapProductNames")
    BannerResponse toResponse(Banner banner);

    // Request to Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "products", ignore = true)
    Banner toBanner(BannerCreationRequest request);

    // Update Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "products", ignore = true)
    @Mapping(target = "rejectionReason", ignore = true) // Giá»¯ nguyÃªn rejectionReason, chá»‰ admin má»›i cÃ³ thá»ƒ thay Ä‘á»•i qua service
    @Mapping(target = "pendingReview", ignore = true)
    void updateBanner(@MappingTarget Banner banner, BannerUpdateRequest request);

    @Named("mapProductIds")
    default List<String> mapProductIds(List<Product> products) {
        if (products == null) return null;
        return products.stream().map(Product::getId).toList();
    }

    @Named("mapProductNames")
    default List<String> mapProductNames(List<Product> products) {
        if (products == null) return null;
        return products.stream().map(Product::getName).toList();
    }
}
