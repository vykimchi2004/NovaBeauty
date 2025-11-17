package com.nova_beauty.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nova_beauty.backend.entity.CartItem;

public interface CartItemRepository extends JpaRepository<CartItem, String> {

    @Query("select ci from CartItem ci where ci.cart.id = :cartId and ci.product.id = :productId")
    Optional<CartItem> findByCartIdAndProductId(@Param("cartId") String cartId, @Param("productId") String productId);
}
