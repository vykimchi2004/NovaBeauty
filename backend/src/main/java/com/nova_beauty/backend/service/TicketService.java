package com.nova_beauty.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.request.TicketCreationRequest;
import com.nova_beauty.backend.dto.request.TicketUpdateRequest;
import com.nova_beauty.backend.dto.response.TicketResponse;
import com.nova_beauty.backend.entity.SupportTicket;
import com.nova_beauty.backend.enums.TicketAssignee;
import com.nova_beauty.backend.enums.TicketStatus;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.TicketMapper;
import com.nova_beauty.backend.repository.SupportTicketRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TicketService {

    SupportTicketRepository supportTicketRepository;
    TicketMapper ticketMapper;

    @Transactional
    public TicketResponse create(TicketCreationRequest request) {
        SupportTicket ticket = ticketMapper.toEntity(request);
        ticket.setStatus(TicketStatus.NEW);
        ticket.setAssignedTo(TicketAssignee.CS);
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());

        SupportTicket saved = supportTicketRepository.save(ticket);
        return ticketMapper.toResponse(saved);
    }

    public List<TicketResponse> listAll() {
        return supportTicketRepository.findAll().stream()
                .map(ticketMapper::toResponse)
                .toList();
    }

    public List<TicketResponse> listByStatus(TicketStatus status) {
        return supportTicketRepository.findByStatus(status).stream()
                .map(ticketMapper::toResponse)
                .toList();
    }

    public TicketResponse getById(String id) {
        SupportTicket ticket =
                supportTicketRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_EXISTED));
        return ticketMapper.toResponse(ticket);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public TicketResponse update(String id, TicketUpdateRequest request) {
        SupportTicket ticket =
                supportTicketRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_EXISTED));
        if (request.getHandlerNote() != null) {
            ticket.setHandlerNote(request.getHandlerNote());
        }
        if (request.getStatus() != null) {
            ticket.setStatus(TicketStatus.valueOf(request.getStatus()));
        }
        if (request.getAssignedTo() != null) {
            ticket.setAssignedTo(TicketAssignee.valueOf(request.getAssignedTo()));
        }
        ticket.setUpdatedAt(LocalDateTime.now());

        return ticketMapper.toResponse(supportTicketRepository.save(ticket));
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public TicketResponse escalate(String id) {
        SupportTicket ticket =
                supportTicketRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_EXISTED));
        ticket.setAssignedTo(TicketAssignee.ADMIN);
        ticket.setStatus(TicketStatus.ESCALATED);
        ticket.setUpdatedAt(LocalDateTime.now());
        return ticketMapper.toResponse(ticket);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public TicketResponse resolve(String id, String handlerNote) {
        SupportTicket ticket =
                supportTicketRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_EXISTED));
        if (handlerNote != null) {
            ticket.setHandlerNote(handlerNote);
        }
        ticket.setStatus(TicketStatus.RESOLVED);
        ticket.setUpdatedAt(LocalDateTime.now());
        return ticketMapper.toResponse(ticket);
    }
}


