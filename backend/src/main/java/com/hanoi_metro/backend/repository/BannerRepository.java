package com.hanoi_metro.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.hanoi_metro.backend.entity.Banner;

@Repository
public interface BannerRepository extends JpaRepository<Banner, String> {
    List<Banner> findAllByOrderByOrderIndexAsc();

    List<Banner> findByStatusOrderByOrderIndexAsc(boolean status);

    @Query("SELECT COALESCE(MAX(b.orderIndex), 0) FROM Banner b")
    Integer findMaxOrderIndex();
}
