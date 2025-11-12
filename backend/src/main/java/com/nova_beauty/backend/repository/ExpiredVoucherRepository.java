package com.nova_beauty.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nova_beauty.backend.entity.ExpiredVoucher;

@Repository
public interface ExpiredVoucherRepository extends JpaRepository<ExpiredVoucher, String> {
    boolean existsById(String id);
}

