package com.nova_beauty.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.nova_beauty.backend.entity.Inventory;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, String> {

    // TÃ¬m inventory theo product
    Optional<Inventory> findByProductId(String productId);

    // TÃ¬m inventory háº¿t hÃ ng
    @Query("SELECT i FROM Inventory i WHERE i.stockQuantity = 0")
    List<Inventory> findOutOfStockItems();

    // TÃ¬m inventory cÃ³ sá»‘ lÆ°á»£ng tháº¥p (dÆ°á»›i 10)
    @Query("SELECT i FROM Inventory i WHERE i.stockQuantity < 10")
    List<Inventory> findLowStockItems();

    // Äáº¿m tá»•ng sá»‘ lÆ°á»£ng tá»“n kho
    @Query("SELECT SUM(i.stockQuantity) FROM Inventory i")
    Long getTotalStockQuantity();
}
