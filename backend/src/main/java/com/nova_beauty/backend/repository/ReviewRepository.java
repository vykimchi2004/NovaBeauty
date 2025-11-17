package com.nova_beauty.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.Review;
import com.nova_beauty.backend.entity.User;

@Repository
public interface ReviewRepository extends JpaRepository<Review, String> {

    List<Review> findByProductId(String productId);

    List<Review> findByUserId(String userId);

    boolean existsByUserAndProduct(User user, Product product);

    // TÃ¬m review cá»§a user cho product cá»¥ thá»ƒ
    Optional<Review> findByUserIdAndProductId(String userId, String productId);

    // TÃ­nh rating trung bÃ¬nh cá»§a product
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = :productId")
    Double getAverageRatingByProductId(@Param("productId") String productId);

    // TÃ¬m reviews theo keyword trong comment
    @Query("SELECT r FROM Review r WHERE r.comment LIKE %:keyword%")
    Page<Review> findByCommentContaining(@Param("keyword") String keyword, Pageable pageable);

    // TÃ¬m reviews theo rating range
    @Query("SELECT r FROM Review r WHERE r.product.id = :productId AND r.rating BETWEEN :minRating AND :maxRating")
    Page<Review> findByProductIdAndRatingRange(
            @Param("productId") String productId,
            @Param("minRating") Integer minRating,
            @Param("maxRating") Integer maxRating,
            Pageable pageable);
}
