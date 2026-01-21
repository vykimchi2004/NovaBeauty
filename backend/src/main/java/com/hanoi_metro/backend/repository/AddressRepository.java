package com.hanoi_metro.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hanoi_metro.backend.entity.Address;

@Repository
public interface AddressRepository extends JpaRepository<Address, String> {
}

