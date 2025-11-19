package com.nova_beauty.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nova_beauty.backend.entity.Cart;

public interface CartRepository extends JpaRepository<Cart, String> {

    @Query("select c from Cart c where c.user.id = :userId")
    Optional<Cart> findByUserId(@Param("userId") String userId);
}
