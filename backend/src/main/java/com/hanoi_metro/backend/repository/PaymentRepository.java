package com.hanoi_metro.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hanoi_metro.backend.entity.Payment;

public interface PaymentRepository extends JpaRepository<Payment, String> {}
