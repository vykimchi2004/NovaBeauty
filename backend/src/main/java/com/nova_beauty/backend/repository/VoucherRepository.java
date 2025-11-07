package com.nova_beauty.backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nova_beauty.backend.entity.Voucher;
import com.nova_beauty.backend.enums.VoucherStatus;

public interface VoucherRepository extends JpaRepository<Voucher, String> {
    Optional<Voucher> findByCode(String code);

    Optional<Voucher> findByCodeAndStatusAndIsActiveTrue(String code, VoucherStatus status);

    @Query("SELECT v FROM Voucher v WHERE v.expiryDate < :today AND v.status != :expiredStatus")
    List<Voucher> findExpiredVouchers(@Param("today") LocalDate today, @Param("expiredStatus") VoucherStatus expiredStatus);
}


