package com.nova_beauty.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.nova_beauty.backend.dto.request.TicketCreationRequest;
import com.nova_beauty.backend.dto.response.TicketResponse;
import com.nova_beauty.backend.entity.SupportTicket;

@Mapper(componentModel = "spring")
public interface TicketMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "assignedTo", ignore = true)
    @Mapping(target = "csNote", ignore = true)
    @Mapping(target = "adminNote", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    SupportTicket toEntity(TicketCreationRequest request);

    TicketResponse toResponse(SupportTicket ticket);
}
