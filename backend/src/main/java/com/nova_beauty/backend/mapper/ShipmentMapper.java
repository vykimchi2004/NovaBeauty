package com.nova_beauty.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.nova_beauty.backend.dto.response.ShipmentResponse;
import com.nova_beauty.backend.entity.Shipment;

@Mapper(componentModel = "spring")
public interface ShipmentMapper {

    @Mapping(target = "orderId", source = "order.id")
    ShipmentResponse toResponse(Shipment shipment);
}


