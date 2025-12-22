package com.nova_beauty.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.nova_beauty.backend.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    // Check if email exists
    boolean existsByEmail(String email);

    // Find user by email (may return multiple if duplicate exists)
    Optional<User> findByEmail(String email);
    
    // Find all users by email (for handling duplicate emails)
    List<User> findAllByEmail(String email);
    
    // Find first user by email ordered by createAt DESC (newest first)
    Optional<User> findFirstByEmailOrderByCreateAtDesc(String email);
}
