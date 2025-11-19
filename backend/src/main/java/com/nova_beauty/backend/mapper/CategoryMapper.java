package com.nova_beauty.backend.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import com.nova_beauty.backend.dto.request.CategoryCreationRequest;
import com.nova_beauty.backend.dto.request.CategoryUpdateRequest;
import com.nova_beauty.backend.dto.response.CategoryResponse;
import com.nova_beauty.backend.entity.Category;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    // Entity to Response
    @Mapping(target = "parentId", source = "parentCategory.id")
    @Mapping(target = "parentName", source = "parentCategory.name")
    @Mapping(target = "subCategories", source = "subCategories", qualifiedByName = "mapSubCategories")
    @Mapping(target = "productCount", source = "products", qualifiedByName = "mapProductCount")
    CategoryResponse toResponse(Category category);

    // Request to Entity
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "parentCategory", ignore = true)
    @Mapping(target = "subCategories", ignore = true)
    @Mapping(target = "products", ignore = true)
    Category toCategory(CategoryCreationRequest request);

    // Update Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "parentCategory", ignore = true)
    @Mapping(target = "subCategories", ignore = true)
    @Mapping(target = "products", ignore = true)
    void updateCategory(@MappingTarget Category category, CategoryUpdateRequest request);

    @Named("mapSubCategories")
    default List<CategoryResponse> mapSubCategories(List<Category> subCategories) {
        if (subCategories == null) return null;
        return subCategories.stream().map(this::toResponse).toList();
    }

    @Named("mapProductCount")
    default Integer mapProductCount(List<?> products) {
        return products != null ? products.size() : 0;
    }
}
