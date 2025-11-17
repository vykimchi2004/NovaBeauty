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

    // TÃ¬m products theo category
    List<Product> findByCategoryId(String categoryId);

    List<Product> findByStatus(ProductStatus status);

    // TÃ¬m products theo name (case insensitive)
    List<Product> findByNameContainingIgnoreCase(String name);

    // TÃ¬m products theo author
    List<Product> findByAuthorContainingIgnoreCase(String author);

    // TÃ¬m products theo publisher
    List<Product> findByPublisherContainingIgnoreCase(String publisher);

    // TÃ¬m products theo price range
    @Query("SELECT p FROM Product p WHERE p.price BETWEEN :minPrice AND :maxPrice")
    List<Product> findByPriceRange(@Param("minPrice") double minPrice, @Param("maxPrice") double maxPrice);

    // TÃ¬m products theo keyword search (name, author, publisher, description)
    @Query("SELECT p FROM Product p WHERE " + "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.author) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.publisher) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Product> findByKeyword(@Param("keyword") String keyword);

    // TÃ¬m products submitted bá»Ÿi staff cá»¥ thá»ƒ
    List<Product> findBySubmittedBy(User submittedBy);

    // TÃ¬m products theo publication date range
    @Query("SELECT p FROM Product p WHERE p.publicationDate BETWEEN :startDate AND :endDate")
    List<Product> findByPublicationDateRange(
            @Param("startDate") java.time.LocalDate startDate, @Param("endDate") java.time.LocalDate endDate);

    // TÃ¬m products cÃ³ inventory
    @Query("SELECT p FROM Product p WHERE p.inventory IS NOT NULL")
    List<Product> findProductsWithInventory();

    // TÃ¬m products cÃ³ inventory quantity lá»›n hÆ¡n minQuantity
    @Query("SELECT p FROM Product p WHERE p.inventory.stockQuantity > :minQuantity")
    List<Product> findByInventoryQuantityGreaterThan(@Param("minQuantity") int minQuantity);

    // TÃ¬m products cÃ³ discount value lá»›n hÆ¡n discountValue
    List<Product> findByDiscountValueGreaterThan(double discountValue);

    // TÃ¬m products ordered by price ascending
    List<Product> findByStatusOrderByPriceAsc(ProductStatus status);

    // TÃ¬m products ordered by price descending
    List<Product> findByStatusOrderByPriceDesc(ProductStatus status);

    // TÃ¬m products ordered by creation date
    List<Product> findByStatusOrderByCreatedAtDesc(ProductStatus status);

    // TÃ¬m products ordered by update date
    List<Product> findByStatusOrderByUpdatedAtDesc(ProductStatus status);

    // TÃ¬m products ordered by quantity sold
    List<Product> findByStatusOrderByQuantitySoldDesc(ProductStatus status);

    // TÃ­nh sá»‘ lÆ°á»£ng products theo category
    long countByCategoryId(String categoryId);

    // TÃ­nh sá»‘ lÆ°á»£ng products theo status
    long countByStatus(ProductStatus status);

    // TÃ­nh sá»‘ lÆ°á»£ng products submitted bá»Ÿi user cá»¥ thá»ƒ
    long countBySubmittedBy(User submittedBy);

    // TÃ¬m products theo promotion
    List<Product> findByPromotionId(String promotionId);

    // Find product by ID with promotion, category, and other relationships loaded
    @Query("SELECT p FROM Product p " +
           "LEFT JOIN FETCH p.promotion " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.submittedBy " +
           "LEFT JOIN FETCH p.approvedBy " +
           "WHERE p.id = :productId")
    java.util.Optional<Product> findByIdWithRelations(@Param("productId") String productId);
}
