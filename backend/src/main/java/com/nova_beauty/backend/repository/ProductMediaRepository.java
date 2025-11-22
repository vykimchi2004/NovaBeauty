package com.nova_beauty.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.nova_beauty.backend.entity.ProductMedia;

@Repository
public interface ProductMediaRepository extends JpaRepository<ProductMedia, String> {

    // Tìm media mặc định của product
    Optional<ProductMedia> findByProductIdAndIsDefaultTrue(String productId);

    // Lấy tất cả media của product, sắp xếp theo displayOrder
    List<ProductMedia> findByProductIdOrderByDisplayOrderAsc(String productId);

    // Tìm media theo productId và mediaUrl
    Optional<ProductMedia> findByProductIdAndMediaUrl(String productId, String mediaUrl);

    // Đếm số media của product
    long countByProductId(String productId);
}
