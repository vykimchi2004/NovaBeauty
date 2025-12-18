package com.nova_beauty.backend.service;

import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.entity.Order;
import com.nova_beauty.backend.entity.Shipment;
import com.nova_beauty.backend.enums.OrderStatus;
import com.nova_beauty.backend.enums.ShipmentProvider;
import com.nova_beauty.backend.repository.OrderRepository;
import com.nova_beauty.backend.repository.ShipmentRepository;



import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service để tự động đồng bộ trạng thái đơn hàng từ GHN.
 * Chạy định kỳ để cập nhật trạng thái đơn hàng khi GHN giao hàng thành công.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ShipmentSyncService {

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final ShipmentService shipmentService;


    @Scheduled(fixedRate = 300000) // Chạy mỗi 5 phút (backup) - đồng bộ chính khi user xem danh sách đơn hàng
    @Transactional
    public void syncAllShipmentStatuses() {
        try {
            log.debug("Bắt đầu đồng bộ trạng thái đơn hàng từ GHN (background job)...");

            // Lấy tất cả shipments có orderCode (đã tạo trên GHN) và provider là GHN
            List<Shipment> shipments = shipmentRepository.findAll().stream()
                    .filter(s -> s.getProvider() == ShipmentProvider.GHN)
                    .filter(s -> s.getOrderCode() != null && !s.getOrderCode().isBlank())
                    .filter(s -> {
                        // Chỉ sync các đơn chưa ở trạng thái cuối cùng
                        Order order = s.getOrder();
                        if (order == null) {
                            return false;
                        }
                        OrderStatus status = order.getStatus();
                        return status != OrderStatus.DELIVERED
                                && status != OrderStatus.CANCELLED
                                && status != OrderStatus.RETURN_REQUESTED
                                && status != OrderStatus.RETURN_CS_CONFIRMED
                                && status != OrderStatus.RETURN_STAFF_CONFIRMED
                                && status != OrderStatus.REFUNDED
                                && status != OrderStatus.RETURN_REJECTED;
                    })
                    .toList();

            if (shipments.isEmpty()) {
                log.debug("Không có đơn hàng nào cần đồng bộ từ GHN");
                return;
            }

            log.info("Tìm thấy {} đơn hàng cần đồng bộ trạng thái từ GHN", shipments.size());

            int successCount = 0;
            int errorCount = 0;

            for (Shipment shipment : shipments) {
                try {
                    String orderId = shipment.getOrder().getId();
                    shipmentService.syncOrderStatusFromGhn(orderId);
                    successCount++;
                } catch (Exception e) {
                    errorCount++;
                    log.warn("Lỗi khi đồng bộ trạng thái cho shipment {} (order: {}): {}",
                            shipment.getId(),
                            shipment.getOrder() != null ? shipment.getOrder().getId() : "unknown",
                            e.getMessage());
                }
            }

            log.info("Hoàn tất đồng bộ trạng thái từ GHN: {} thành công, {} lỗi", successCount, errorCount);
        } catch (Exception e) {
            log.error("Lỗi khi thực hiện đồng bộ trạng thái từ GHN: {}", e.getMessage(), e);
        }
    }
}


