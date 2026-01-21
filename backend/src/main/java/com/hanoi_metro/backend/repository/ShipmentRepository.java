package com.hanoi_metro.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hanoi_metro.backend.entity.Shipment;

public interface ShipmentRepository extends JpaRepository<Shipment, String> {
    Optional<Shipment> findByOrderCode(String orderCode);

    @Query("select s from Shipment s where s.order.id = :orderId")
    Optional<Shipment> findByOrderId(@Param("orderId") String orderId);
}
