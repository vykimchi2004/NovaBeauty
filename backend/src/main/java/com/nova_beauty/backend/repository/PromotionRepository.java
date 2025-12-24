package com.nova_beauty.backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.nova_beauty.backend.entity.Promotion;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.enums.PromotionStatus;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, String> {

    Optional<Promotion> findByCode(String code);

    boolean existsByCode(String code);

    // Status-based queries
    List<Promotion> findByStatus(PromotionStatus status);

    Page<Promotion> findByStatus(PromotionStatus status, Pageable pageable);

    long countByStatus(PromotionStatus status);

    // User-based queries
    List<Promotion> findBySubmittedBy(User submittedBy);

    Page<Promotion> findBySubmittedBy(User submittedBy, Pageable pageable);

    List<Promotion> findByApprovedBy(User approvedBy);

    // Active promotions
    @Query("SELECT p FROM Promotion p WHERE p.status = 'APPROVED' AND p.isActive = true "
            + "AND (p.expiryDate IS NULL OR p.expiryDate >= :currentDate)")
    List<Promotion> findActivePromotions(@Param("currentDate") LocalDate currentDate);

    // Expiring promotions
    @Query("SELECT p FROM Promotion p WHERE p.status = 'APPROVED' AND p.expiryDate BETWEEN :startDate AND :endDate")
    List<Promotion> findPromotionsExpiringSoon(
            @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    long countByImageUrl(String imageUrl);

    // Category and Product based queries
    @Query("SELECT p FROM Promotion p JOIN p.categoryApply c WHERE c.id = :categoryId AND p.status = 'APPROVED'")
    List<Promotion> findByCategoryId(@Param("categoryId") String categoryId);

    // Tìm các promotion có product này trong productApply (không phân biệt status)
    @Query("SELECT p FROM Promotion p JOIN p.productApply pr WHERE pr.id = :productId")
    List<Promotion> findByProductId(@Param("productId") String productId);
    
    // Tìm các promotion approved có product này trong productApply
    @Query("SELECT p FROM Promotion p JOIN p.productApply pr WHERE pr.id = :productId AND p.status = 'APPROVED'")
    List<Promotion> findApprovedByProductId(@Param("productId") String productId);

    // Active by product/category (approved, active, not expired)
    @Query("SELECT p FROM Promotion p JOIN p.productApply pr "
            + "WHERE pr.id = :productId AND p.status = 'APPROVED' AND p.isActive = true "
            + "AND (p.expiryDate IS NULL OR p.expiryDate >= :today)")
    List<Promotion> findActiveByProductId(@Param("productId") String productId, @Param("today") LocalDate today);

    @Query("SELECT p FROM Promotion p JOIN p.categoryApply c "
            + "WHERE c.id = :categoryId AND p.status = 'APPROVED' AND p.isActive = true "
            + "AND (p.expiryDate IS NULL OR p.expiryDate >= :today)")
    List<Promotion> findActiveByCategoryId(@Param("categoryId") String categoryId, @Param("today") LocalDate today);

    // Tìm các promotion đã hết hạn nhưng chưa được chuyển vào bảng hết hạn
    @Query("SELECT p FROM Promotion p WHERE p.expiryDate < :today AND p.status != :expiredStatus")
    List<Promotion> findExpiredPromotions(@Param("today") LocalDate today, @Param("expiredStatus") PromotionStatus expiredStatus);

    // Tìm các promotion đã được approve nhưng chưa active và đã đến startDate
    @Query("SELECT p FROM Promotion p WHERE p.status = 'APPROVED' AND (p.isActive = false OR p.isActive IS NULL) " +
           "AND p.startDate <= :today AND (p.expiryDate IS NULL OR p.expiryDate >= :today)")
    List<Promotion> findPromotionsToActivate(@Param("today") LocalDate today);
}
