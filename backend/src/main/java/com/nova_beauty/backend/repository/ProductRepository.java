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

    // Tìm products theo status
    List<Product> findByStatus(ProductStatus status);

    // Tìm products theo name (case insensitive)
    List<Product> findByNameContainingIgnoreCase(String name);

    // Tìm products theo author
    List<Product> findByAuthorContainingIgnoreCase(String author);

    // Tìm products theo publisher
    List<Product> findByPublisherContainingIgnoreCase(String publisher);

    // Tìm products theo price range
    @Query("SELECT p FROM Product p WHERE p.price BETWEEN :minPrice AND :maxPrice")
    List<Product> findByPriceRange(@Param("minPrice") double minPrice, @Param("maxPrice") double maxPrice);

    // Tìm products theo keyword search (name, author, publisher, description)
    @Query("SELECT p FROM Product p WHERE " + "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.author) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.publisher) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
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
}
