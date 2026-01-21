package com.hanoi_metro.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hanoi_metro.backend.entity.Magazine;

public interface MagazineRepository extends JpaRepository<Magazine, String> {
    List<Magazine> findByStatusOrderByStartDateAsc(Boolean status);
}
