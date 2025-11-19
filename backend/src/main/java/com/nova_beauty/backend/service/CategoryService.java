package com.nova_beauty.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.request.CategoryCreationRequest;
import com.nova_beauty.backend.dto.request.CategoryUpdateRequest;
import com.nova_beauty.backend.dto.response.CategoryResponse;
import com.nova_beauty.backend.entity.Category;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.CategoryMapper;
import com.nova_beauty.backend.repository.CategoryRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class CategoryService {

    CategoryRepository categoryRepository;
    CategoryMapper categoryMapper;

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse createCategory(CategoryCreationRequest request) {
        // Check if id already exists
        if (categoryRepository.findById(request.getId()).isPresent()) {
            throw new AppException(ErrorCode.CATEGORY_ALREADY_EXISTS); // MÃ£ danh má»¥c Ä‘Ã£ tá»“n táº¡i
        }

        // Check if name already exists
        if (categoryRepository.findByName(request.getName()).isPresent()) {
            throw new AppException(ErrorCode.CATEGORY_ALREADY_EXISTS); // TÃªn danh má»¥c Ä‘Ã£ tá»“n táº¡i
        }

        // Create category entity using mapper
        Category category = categoryMapper.toCategory(request);
        category.setStatus(request.getStatus() != null ? request.getStatus() : true);
        category.setCreatedAt(LocalDateTime.now());
        category.setUpdatedAt(LocalDateTime.now());

        // Set parent category if provided
        if (request.getParentId() != null && !request.getParentId().isEmpty()) {
            Category parentCategory = categoryRepository
                    .findById(request.getParentId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));
            category.setParentCategory(parentCategory);
        }

        try {
            Category savedCategory = categoryRepository.save(category);
            log.info("Category created with ID: {}", savedCategory.getId());
            return categoryMapper.toResponse(savedCategory);
        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity violation when creating category", e);
            // This can happen if id or name violates unique constraint despite our checks
            throw new AppException(ErrorCode.CATEGORY_ALREADY_EXISTS);
        }
    }

    public CategoryResponse getCategoryById(String categoryId) {
        Category category = categoryRepository
                .findById(categoryId)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));

        return categoryMapper.toResponse(category);
    }

    public List<CategoryResponse> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();

        return categories.stream().map(categoryMapper::toResponse).toList();
    }

    public List<CategoryResponse> getRootCategories() {
        List<Category> rootCategories = categoryRepository.findByParentCategoryIsNull();

        return rootCategories.stream().map(categoryMapper::toResponse).toList();
    }

    public List<CategoryResponse> getSubCategories(String parentId) {
        List<Category> subCategories = categoryRepository.findByParentCategoryId(parentId);

        return subCategories.stream().map(categoryMapper::toResponse).toList();
    }

    public List<CategoryResponse> getActiveCategories() {
        List<Category> activeCategories = categoryRepository.findByStatus(true);

        return activeCategories.stream().map(categoryMapper::toResponse).toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse updateCategory(String categoryId, CategoryUpdateRequest request) {
        Category category = categoryRepository
                .findById(categoryId)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));

        // Update category using mapper
        categoryMapper.updateCategory(category, request);
        category.setUpdatedAt(LocalDateTime.now());

        // Update parent category if provided
        if (request.getParentId() != null) {
            if (request.getParentId().isEmpty()) {
                category.setParentCategory(null);
            } else {
                Category parentCategory = categoryRepository
                        .findById(request.getParentId())
                        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));
                category.setParentCategory(parentCategory);
            }
        }

        Category savedCategory = categoryRepository.save(category);
        log.info("Category updated: {}", categoryId);

        return categoryMapper.toResponse(savedCategory);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteCategory(String categoryId) {
        Category category = categoryRepository
                .findById(categoryId)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));

        // Check if category has sub-categories
        if (categoryRepository.countSubCategoriesByCategoryId(categoryId) > 0) {
            throw new AppException(ErrorCode.CATEGORY_HAS_SUBCATEGORIES);
        }

        // Check if category has products
        if (categoryRepository.countProductsByCategoryId(categoryId) > 0) {
            throw new AppException(ErrorCode.CATEGORY_HAS_PRODUCTS);
        }

        categoryRepository.delete(category);
        log.info("Category deleted: {}", categoryId);
    }
}
