package com.nova_beauty.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nova_beauty.backend.entity.Order;

public interface OrderRepository extends JpaRepository<Order, String> {

    /**
     * Tìm các đơn hàng theo email của user (subject của JWT).
     */
    @EntityGraph(attributePaths = {"items", "items.product", "items.product.defaultMedia", "items.product.mediaList"})
    @Query("SELECT o FROM Order o WHERE o.user.email = :email ORDER BY o.orderDateTime DESC")
    List<Order> findByUserEmail(@Param("email") String email);

    /**
     * Tìm đơn hàng gắn với một giỏ hàng cụ thể.
     * Do mapping @OneToOne nên tối đa chỉ có 1 đơn cho mỗi cart.
     */
    @EntityGraph(attributePaths = {"items", "items.product", "items.product.defaultMedia", "items.product.mediaList"})
    Optional<Order> findByCartId(String cartId);

    @EntityGraph(attributePaths = {"items", "items.product", "items.product.defaultMedia", "items.product.mediaList"})
    Optional<Order> findByCode(String code);

    @Override
    @EntityGraph(attributePaths = {"items", "items.product", "items.product.defaultMedia", "items.product.mediaList"})
    Optional<Order> findById(String id);
}
