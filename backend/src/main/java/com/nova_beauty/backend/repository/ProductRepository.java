package com.nova_beauty.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.enums.ProductStatus;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {

    // Tìm products theo category
    List<Product> findByCategoryId(String categoryId);

    List<Product> findByStatus(ProductStatus status);
    
    // Find products by status with category loaded (for promotion calculation)
    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.status = :status")
    List<Product> findByStatusWithCategory(@Param("status") ProductStatus status);
    
    // Find products by status with category and submittedBy loaded (for chatbot and other use cases)
    @Query("SELECT DISTINCT p FROM Product p " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.submittedBy " +
           "WHERE p.status = :status")
    List<Product> findByStatusWithCategoryAndSubmittedBy(@Param("status") ProductStatus status);
    
    // Find products by category ID with category loaded (for promotion calculation)
    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.category.id = :categoryId")
    List<Product> findByCategoryIdWithCategory(@Param("categoryId") String categoryId);

    // Tìm products theo name (case insensitive)
    List<Product> findByNameContainingIgnoreCase(String name);

    // Tìm products theo texture (kết cấu)
    List<Product> findByTextureContainingIgnoreCase(String texture);

    // Tìm products theo skinType (loại da)
    List<Product> findBySkinTypeContainingIgnoreCase(String skinType);

    // TÃ¬m products theo price range
    @Query("SELECT p FROM Product p WHERE p.price BETWEEN :minPrice AND :maxPrice")
    List<Product> findByPriceRange(@Param("minPrice") double minPrice, @Param("maxPrice") double maxPrice);

    // Tìm products theo keyword search (name, texture, skinType, description, brand, uses, characteristics)
    @Query("SELECT p FROM Product p WHERE " + 
            "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.brand) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.texture) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.skinType) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.uses) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.characteristics) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Product> findByKeyword(@Param("keyword") String keyword);

    // Tìm products submitted bởi staff cụ thể
    List<Product> findBySubmittedBy(User submittedBy);

    // Tìm products theo publication date range
    @Query("SELECT p FROM Product p WHERE p.publicationDate BETWEEN :startDate AND :endDate")
    List<Product> findByPublicationDateRange(
            @Param("startDate") java.time.LocalDate startDate, @Param("endDate") java.time.LocalDate endDate);

    // Tìm products có inventory
    @Query("SELECT p FROM Product p WHERE p.inventory IS NOT NULL")
    List<Product> findProductsWithInventory();

    // Tìm products có inventory quantity lớn hơn minQuantity
    @Query("SELECT p FROM Product p WHERE p.inventory.stockQuantity > :minQuantity")
    List<Product> findByInventoryQuantityGreaterThan(@Param("minQuantity") int minQuantity);

    // Tìm products có discount value lớn hơn discountValue
    List<Product> findByDiscountValueGreaterThan(double discountValue);

    // Tìm products ordered by price ascending
    List<Product> findByStatusOrderByPriceAsc(ProductStatus status);

    // Tìm products ordered by price descending
    List<Product> findByStatusOrderByPriceDesc(ProductStatus status);

    // Tìm products ordered by creation date
    List<Product> findByStatusOrderByCreatedAtDesc(ProductStatus status);

    // Tìm products ordered by update date
    List<Product> findByStatusOrderByUpdatedAtDesc(ProductStatus status);

    // Tìm products ordered by quantity sold
    List<Product> findByStatusOrderByQuantitySoldDesc(ProductStatus status);

    // Tính số lượng products theo category
    long countByCategoryId(String categoryId);

    // Tính số lượng products theo status
    long countByStatus(ProductStatus status);

    // Tính số lượng products submitted bởi user cụ thể
    long countBySubmittedBy(User submittedBy);

    // Tìm products theo promotion (Nova dùng field promotionApply nên cần @Query tường minh)
    @Query("SELECT p FROM Product p WHERE p.promotionApply.id = :promotionId")
    List<Product> findByPromotionId(@Param("promotionId") String promotionId);

    // Find product by ID with promotion, category, and other relationships loaded
    @Query("SELECT p FROM Product p " +
           "LEFT JOIN FETCH p.promotionApply " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.submittedBy " +
           "LEFT JOIN FETCH p.approvedBy " +
           "LEFT JOIN FETCH p.inventory " +
           "WHERE p.id = :productId")
    java.util.Optional<Product> findByIdWithRelations(@Param("productId") String productId);
}
