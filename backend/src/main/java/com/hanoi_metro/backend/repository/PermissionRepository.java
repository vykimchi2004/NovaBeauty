package com.hanoi_metro.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.hanoi_metro.backend.entity.Permission;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, String> {}
