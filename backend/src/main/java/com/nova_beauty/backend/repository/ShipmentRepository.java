package com.nova_beauty.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nova_beauty.backend.entity.Shipment;

public interface ShipmentRepository extends JpaRepository<Shipment, String> {
}


