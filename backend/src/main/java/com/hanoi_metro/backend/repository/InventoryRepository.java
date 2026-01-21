package com.hanoi_metro.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.hanoi_metro.backend.entity.Inventory;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, String> {

    // Tìm inventory theo product
    Optional<Inventory> findByProductId(String productId);

    // Tìm inventory hết hàng
    @Query("SELECT i FROM Inventory i WHERE i.stockQuantity = 0")
    List<Inventory> findOutOfStockItems();

    // Tìm inventory có số lượng thấp (dưới 10)
    @Query("SELECT i FROM Inventory i WHERE i.stockQuantity < 10")
    List<Inventory> findLowStockItems();

    // Đếm tổng số lượng tồn kho
    @Query("SELECT SUM(i.stockQuantity) FROM Inventory i")
    Long getTotalStockQuantity();
}
