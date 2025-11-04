package com.nova_beauty.backend.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.entity.Otp;

@Repository
public interface OtpRepository extends JpaRepository<Otp, String> {

    Optional<Otp> findByEmailAndCodeAndExpiresAtAfterAndIsUsedFalse(String email, String code, LocalDateTime now);

    @Modifying
    @Transactional
    @Query("UPDATE Otp o SET o.isUsed = true WHERE o.email = :email AND o.code = :code")
    void markOtpAsUsed(String email, String code);

    @Modifying
    @Transactional
    void deleteAllByEmail(String email);
}
