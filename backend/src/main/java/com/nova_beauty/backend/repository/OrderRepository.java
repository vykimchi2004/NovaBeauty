package com.nova_beauty.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nova_beauty.backend.entity.Order;

public interface OrderRepository extends JpaRepository<Order, String> {}
