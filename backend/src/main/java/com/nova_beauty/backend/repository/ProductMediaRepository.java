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

    // TÃ¬m media máº·c Ä‘á»‹nh cá»§a product
    Optional<ProductMedia> findByProductIdAndIsDefaultTrue(String productId);

    // Láº¥y táº¥t cáº£ media cá»§a product, sáº¯p xáº¿p theo displayOrder
    List<ProductMedia> findByProductIdOrderByDisplayOrderAsc(String productId);

    // TÃ¬m media theo productId vÃ  mediaUrl
    Optional<ProductMedia> findByProductIdAndMediaUrl(String productId, String mediaUrl);

    // Äáº¿m sá»‘ media cá»§a product
    long countByProductId(String productId);
}
