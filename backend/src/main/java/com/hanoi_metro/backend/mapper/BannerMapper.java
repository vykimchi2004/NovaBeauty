package com.hanoi_metro.backend.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import com.hanoi_metro.backend.dto.request.BannerCreationRequest;
import com.hanoi_metro.backend.dto.request.BannerUpdateRequest;
import com.hanoi_metro.backend.dto.response.BannerResponse;
import com.hanoi_metro.backend.entity.Banner;
import com.hanoi_metro.backend.entity.Product;

@Mapper(componentModel = "spring")
public interface BannerMapper {

    // Entity to Response
    @Mapping(target = "createdBy", source = "createdBy.id")
    @Mapping(target = "createdByName", source = "createdBy.fullName")
    @Mapping(target = "productIds", source = "products", qualifiedByName = "mapProductIds")
    @Mapping(target = "productNames", source = "products", qualifiedByName = "mapProductNames")
    @Mapping(target = "isMagazine", source = "isMagazine")
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
