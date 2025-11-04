package com.nova_beauty.backend.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.entity.Inventory;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.repository.InventoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    // Tạo inventory cho product mới
    @Transactional
    public Inventory createInventory(String productId, Integer initialStock) {
        Inventory inventory = Inventory.builder()
                .product(Product.builder().id(productId).build())
                .stockQuantity(initialStock)
                .lastUpdated(LocalDate.now())
                .build();

        return inventoryRepository.save(inventory);
    }

    // Tăng số lượng tồn kho (khi nhập hàng)
    @Transactional
    public Inventory addStock(String productId, Integer quantity) {
        Inventory inventory = inventoryRepository
                .findByProductId(productId)
                .orElseThrow(() -> new RuntimeException("Inventory not found for product: " + productId));

        inventory.setStockQuantity(inventory.getStockQuantity() + quantity);
        inventory.setLastUpdated(LocalDate.now());
        return inventoryRepository.save(inventory);
    }

    // Cập nhật số lượng tồn kho
    @Transactional
    public Inventory updateStock(String productId, Integer newStock) {
        Inventory inventory = inventoryRepository
                .findByProductId(productId)
                .orElseThrow(() -> new RuntimeException("Inventory not found for product: " + productId));

        inventory.setStockQuantity(newStock);
        inventory.setLastUpdated(LocalDate.now());
        return inventoryRepository.save(inventory);
    }

    // Giảm số lượng tồn kho (khi bán)
    @Transactional
    public Inventory reduceStock(String productId, Integer quantity) {
        Inventory inventory = inventoryRepository
                .findByProductId(productId)
                .orElseThrow(() -> new RuntimeException("Inventory not found for product: " + productId));

        if (inventory.getStockQuantity() < quantity) {
            throw new RuntimeException("Insufficient stock. Available: " + inventory.getStockQuantity());
        }

        inventory.setStockQuantity(inventory.getStockQuantity() - quantity);
        return inventoryRepository.save(inventory);
    }

    // Lấy số lượng tồn kho của product
    public Integer getStockQuantity(String productId) {
        return inventoryRepository
                .findByProductId(productId)
                .map(Inventory::getStockQuantity)
                .orElse(0);
    }

    // Kiểm tra có đủ hàng không
    public boolean isInStock(String productId, Integer requestedQuantity) {
        Integer availableStock = getStockQuantity(productId);
        return availableStock >= requestedQuantity;
    }

    // Lấy danh sách sản phẩm hết hàng
    public List<Inventory> getOutOfStockItems() {
        return inventoryRepository.findOutOfStockItems();
    }

    // Lấy danh sách sản phẩm sắp hết hàng
    public List<Inventory> getLowStockItems() {
        return inventoryRepository.findLowStockItems();
    }

    // Lấy tổng số lượng tồn kho
    public Long getTotalStockQuantity() {
        return inventoryRepository.getTotalStockQuantity();
    }
}
