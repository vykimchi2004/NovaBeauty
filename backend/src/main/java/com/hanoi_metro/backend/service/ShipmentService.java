package com.hanoi_metro.backend.service;

import org.springframework.stereotype.Service;

import com.hanoi_metro.backend.dto.response.ShipmentResponse;
import com.hanoi_metro.backend.entity.Shipment;
import com.hanoi_metro.backend.exception.AppException;
import com.hanoi_metro.backend.exception.ErrorCode;
import com.hanoi_metro.backend.repository.ShipmentRepository;
import com.hanoi_metro.backend.mapper.ShipmentMapper;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShipmentService {
    ShipmentRepository shipmentRepository;
    ShipmentMapper shipmentMapper;

    // ==================== Shipment Retrieval ====================

    // Lấy thông tin vận đơn theo order ID.
    public ShipmentResponse getShipmentByOrderId(String orderId) {
        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_EXISTED,
                        "Không tìm thấy vận đơn cho đơn hàng: " + orderId));
        return shipmentMapper.toResponse(shipment);
    }

    // Lấy thông tin vận đơn theo GHN order code.
    public ShipmentResponse getShipmentByOrderCode(String orderCode) {
        Shipment shipment = shipmentRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_EXISTED,
                        "Không tìm thấy vận đơn với mã GHN: " + orderCode));
        return shipmentMapper.toResponse(shipment);
    }
}
