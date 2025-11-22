package com.nova_beauty.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nova_beauty.backend.entity.Address;

@Repository
public interface AddressRepository extends JpaRepository<Address, String> {
}

