package com.hanoi_metro.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hanoi_metro.backend.entity.CartItem;

public interface CartItemRepository extends JpaRepository<CartItem, String> {

    @Query("""
        select ci from CartItem ci
        where ci.cart.id = :cartId
          and ci.product.id = :productId
          and (ci.colorCode is null or trim(ci.colorCode) = '')
    """)
    Optional<CartItem> findByCartIdAndProductId(@Param("cartId") String cartId, @Param("productId") String productId);

    @Query("""
        select ci from CartItem ci
        where ci.cart.id = :cartId
          and ci.product.id = :productId
          and ci.colorCode = :colorCode
    """)
    Optional<CartItem> findByCartIdAndProductIdAndColorCode(
            @Param("cartId") String cartId,
            @Param("productId") String productId,
            @Param("colorCode") String colorCode);

    @Query("select ci from CartItem ci where ci.cart.id = :cartId")
    List<CartItem> findByCartId(@Param("cartId") String cartId);

    @Query("select ci from CartItem ci where ci.product.id = :productId")
    List<CartItem> findByProductId(@Param("productId") String productId);
}
