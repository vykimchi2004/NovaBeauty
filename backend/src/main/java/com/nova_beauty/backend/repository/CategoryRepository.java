package com.nova_beauty.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.nova_beauty.backend.entity.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, String> {

    // Category gá»‘c (khÃ´ng cÃ³ parent)
    List<Category> findByParentCategoryIsNull();

    // Sub-categories of category
    List<Category> findByParentCategoryId(String parentId);

    Optional<Category> findByName(String name);

    List<Category> findByStatus(Boolean status);

    // Search
    @Query("SELECT c FROM Category c WHERE c.name LIKE %:keyword% OR c.description LIKE %:keyword%")
    List<Category> findByKeyword(@Param("keyword") String keyword);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.category.id = :categoryId")
    long countProductsByCategoryId(@Param("categoryId") String categoryId);

    @Query("SELECT COUNT(c) FROM Category c WHERE c.parentCategory.id = :categoryId")
    long countSubCategoriesByCategoryId(@Param("categoryId") String categoryId);
}
