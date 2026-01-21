package com.hanoi_metro.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hanoi_metro.backend.dto.response.ShipmentResponse;
import com.hanoi_metro.backend.entity.Shipment;

@Mapper(componentModel = "spring")
public interface ShipmentMapper {

    @Mapping(target = "orderId", source = "order.id")
    ShipmentResponse toResponse(Shipment shipment);
}


