package com.nova_beauty.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nova_beauty.backend.entity.Payment;

public interface PaymentRepository extends JpaRepository<Payment, String> {}
