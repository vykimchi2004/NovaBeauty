package com.nova_beauty.backend.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.entity.Inventory;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.repository.InventoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    // Táº¡o inventory cho product má»›i
    @Transactional
    public Inventory createInventory(String productId, Integer initialStock) {
        Inventory inventory = Inventory.builder()
                .product(Product.builder().id(productId).build())
                .stockQuantity(initialStock)
                .lastUpdated(LocalDate.now())
                .build();

        return inventoryRepository.save(inventory);
    }

    // TÄƒng sá»‘ lÆ°á»£ng tá»“n kho (khi nháº­p hÃ ng)
    @Transactional
    public Inventory addStock(String productId, Integer quantity) {
        Inventory inventory = inventoryRepository
                .findByProductId(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        inventory.setStockQuantity(inventory.getStockQuantity() + quantity);
        inventory.setLastUpdated(LocalDate.now());
        return inventoryRepository.save(inventory);
    }

    // Cáº­p nháº­t sá»‘ lÆ°á»£ng tá»“n kho
    @Transactional
    public Inventory updateStock(String productId, Integer newStock) {
        Inventory inventory = inventoryRepository
                .findByProductId(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        inventory.setStockQuantity(newStock);
        inventory.setLastUpdated(LocalDate.now());
        return inventoryRepository.save(inventory);
    }

    // Giáº£m sá»‘ lÆ°á»£ng tá»“n kho (khi bÃ¡n)
    @Transactional
    public Inventory reduceStock(String productId, Integer quantity) {
        Inventory inventory = inventoryRepository
                .findByProductId(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        if (inventory.getStockQuantity() < quantity) {
            throw new AppException(ErrorCode.OUT_OF_STOCK);
        }

        inventory.setStockQuantity(inventory.getStockQuantity() - quantity);
        return inventoryRepository.save(inventory);
    }

    // Láº¥y sá»‘ lÆ°á»£ng tá»“n kho cá»§a product
    public Integer getStockQuantity(String productId) {
        return inventoryRepository
                .findByProductId(productId)
                .map(Inventory::getStockQuantity)
                .orElse(0);
    }

    // Kiá»ƒm tra cÃ³ Ä‘á»§ hÃ ng khÃ´ng
    public boolean isInStock(String productId, Integer requestedQuantity) {
        Integer availableStock = getStockQuantity(productId);
        return availableStock >= requestedQuantity;
    }

    // Láº¥y danh sÃ¡ch sáº£n pháº©m háº¿t hÃ ng
    public List<Inventory> getOutOfStockItems() {
        return inventoryRepository.findOutOfStockItems();
    }

    // Láº¥y danh sÃ¡ch sáº£n pháº©m sáº¯p háº¿t hÃ ng
    public List<Inventory> getLowStockItems() {
        return inventoryRepository.findLowStockItems();
    }

    // Láº¥y tá»•ng sá»‘ lÆ°á»£ng tá»“n kho
    public Long getTotalStockQuantity() {
        return inventoryRepository.getTotalStockQuantity();
    }
}
