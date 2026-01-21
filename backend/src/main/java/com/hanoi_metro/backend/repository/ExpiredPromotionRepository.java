package com.hanoi_metro.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hanoi_metro.backend.entity.ExpiredPromotion;

@Repository
public interface ExpiredPromotionRepository extends JpaRepository<ExpiredPromotion, String> {
    boolean existsById(String id);
}

