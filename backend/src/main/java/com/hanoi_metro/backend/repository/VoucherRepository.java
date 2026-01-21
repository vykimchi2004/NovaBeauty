package com.hanoi_metro.backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hanoi_metro.backend.entity.Voucher;
import com.hanoi_metro.backend.entity.User;
import com.hanoi_metro.backend.enums.VoucherStatus;

public interface VoucherRepository extends JpaRepository<Voucher, String> {
    Optional<Voucher> findByCode(String code);

    boolean existsByCode(String code);

    Optional<Voucher> findByCodeAndStatusAndIsActiveTrue(String code, VoucherStatus status);

    List<Voucher> findByStatus(VoucherStatus status);

    List<Voucher> findBySubmittedBy(User submittedBy);

    @Query("SELECT v FROM Voucher v WHERE v.status = 'APPROVED' AND v.isActive = true "
            + "AND (v.expiryDate IS NULL OR v.expiryDate >= :today)")
    List<Voucher> findActiveVouchers(@Param("today") LocalDate today);

    long countByImageUrl(String imageUrl);

    // Tìm các voucher đã hết hạn nhưng chưa được chuyển vào bảng hết hạn
    @Query("SELECT v FROM Voucher v WHERE v.expiryDate < :today AND v.status != :expiredStatus")
    List<Voucher> findExpiredVouchers(@Param("today") LocalDate today, @Param("expiredStatus") VoucherStatus expiredStatus);

    // Tìm các voucher có product này trong productApply
    @Query("SELECT v FROM Voucher v JOIN v.productApply pr WHERE pr.id = :productId")
    List<Voucher> findByProductId(@Param("productId") String productId);
}
