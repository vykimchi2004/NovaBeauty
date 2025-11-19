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

    // TÃ¬m cÃ¡c promotion cÃ³ product nÃ y trong productApply (khÃ´ng phÃ¢n biá»‡t status)
    @Query("SELECT p FROM Promotion p JOIN p.productApply pr WHERE pr.id = :productId")
    List<Promotion> findByProductId(@Param("productId") String productId);
    
    // TÃ¬m cÃ¡c promotion approved cÃ³ product nÃ y trong productApply
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

    // TÃ¬m cÃ¡c promotion Ä‘Ã£ háº¿t háº¡n nhÆ°ng chÆ°a Ä‘Æ°á»£c chuyá»ƒn vÃ o báº£ng háº¿t háº¡n
    @Query("SELECT p FROM Promotion p WHERE p.expiryDate < :today AND p.status != :expiredStatus")
    List<Promotion> findExpiredPromotions(@Param("today") LocalDate today, @Param("expiredStatus") PromotionStatus expiredStatus);

    // TÃ¬m cÃ¡c promotion Ä‘Ã£ Ä‘Æ°á»£c approve nhÆ°ng chÆ°a active vÃ  Ä‘Ã£ Ä‘áº¿n startDate
    @Query("SELECT p FROM Promotion p WHERE p.status = 'APPROVED' AND (p.isActive = false OR p.isActive IS NULL) " +
           "AND p.startDate <= :today AND (p.expiryDate IS NULL OR p.expiryDate >= :today)")
    List<Promotion> findPromotionsToActivate(@Param("today") LocalDate today);
}
