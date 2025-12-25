package com.nova_beauty.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nova_beauty.backend.entity.Magazine;

public interface MagazineRepository extends JpaRepository<Magazine, String> {
    List<Magazine> findByStatusOrderByStartDateAsc(Boolean status);
}
