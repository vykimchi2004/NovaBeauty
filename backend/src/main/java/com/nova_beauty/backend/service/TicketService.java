package com.nova_beauty.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.request.TicketCreationRequest;
import com.nova_beauty.backend.dto.request.TicketUpdateRequest;
import com.nova_beauty.backend.dto.response.TicketResponse;
import com.nova_beauty.backend.entity.SupportTicket;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.enums.TicketAssignee;
import com.nova_beauty.backend.enums.TicketStatus;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.TicketMapper;
import com.nova_beauty.backend.repository.SupportTicketRepository;
import com.nova_beauty.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TicketService {

    SupportTicketRepository supportTicketRepository;
    TicketMapper ticketMapper;
    UserRepository userRepository;

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

    private TicketResponse toResponseWithHandler(SupportTicket ticket) {
        TicketResponse response = ticketMapper.toResponse(ticket);
        if (ticket.getHandlerId() != null && !ticket.getHandlerId().isEmpty()) {
            response.setHandlerId(ticket.getHandlerId());
            userRepository.findById(ticket.getHandlerId()).ifPresent(handler -> {
                response.setHandlerName(handler.getFullName() != null ? handler.getFullName() : handler.getEmail());
            });
        }
        return response;
    }

    public List<TicketResponse> listAll() {
        return supportTicketRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponseWithHandler)
                .toList();
    }

    public List<TicketResponse> listByStatus(TicketStatus status) {
        return supportTicketRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::toResponseWithHandler)
                .toList();
    }

    public TicketResponse getById(String id) {
        SupportTicket ticket =
                supportTicketRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_EXISTED));
        return toResponseWithHandler(ticket);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER_SUPPORT')")
    public TicketResponse update(String id, TicketUpdateRequest request) {
        SupportTicket ticket =
                supportTicketRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_EXISTED));
        
        // Get current user from security context
        var context = SecurityContextHolder.getContext();
        String currentUserEmail = context.getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        
        String roleName = currentUser.getRole() != null ? currentUser.getRole().getName() : "";
        boolean isAdmin = "ADMIN".equals(roleName) || "STAFF".equals(roleName);
        boolean isCS = "CUSTOMER_SUPPORT".equals(roleName);
        
        // CSKH chỉ được cập nhật csNote
        if (isCS && request.getCsNote() != null) {
            // Check if ticket already has a handler
            boolean hasHandler = (ticket.getHandlerId() != null && !ticket.getHandlerId().isEmpty());
            
            if (!hasHandler) {
                // No handler yet - check if ticket is resolved
                if (ticket.getStatus() == TicketStatus.RESOLVED) {
                    throw new AppException(ErrorCode.UNAUTHORIZED);
                }
                // Allow this CSKH to accept the complaint
                ticket.setCsNote(request.getCsNote());
                ticket.setHandlerId(currentUser.getId());
                ticket.setAssignedTo(TicketAssignee.CS);
                ticket.setStatus(TicketStatus.IN_PROGRESS);
            } else if (ticket.getHandlerId().equals(currentUser.getId())) {
                // Same handler - allow updating note (even if resolved)
                ticket.setCsNote(request.getCsNote());
            } else {
                // Different handler already exists - reject
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }
        
        // Admin có thể cập nhật adminNote
        if (isAdmin && request.getAdminNote() != null) {
            ticket.setAdminNote(request.getAdminNote());
        }
        
        if (request.getStatus() != null) {
            ticket.setStatus(TicketStatus.valueOf(request.getStatus()));
        }
        if (request.getAssignedTo() != null) {
            ticket.setAssignedTo(TicketAssignee.valueOf(request.getAssignedTo()));
        }
        ticket.setUpdatedAt(LocalDateTime.now());

        SupportTicket saved = supportTicketRepository.save(ticket);
        return toResponseWithHandler(saved);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER_SUPPORT')")
    public TicketResponse escalate(String id) {
        SupportTicket ticket =
                supportTicketRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_EXISTED));
        ticket.setAssignedTo(TicketAssignee.ADMIN);
        ticket.setStatus(TicketStatus.ESCALATED);
        ticket.setUpdatedAt(LocalDateTime.now());
        SupportTicket saved = supportTicketRepository.save(ticket);
        return toResponseWithHandler(saved);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','STAFF','CUSTOMER_SUPPORT')")
    public TicketResponse resolve(String id, String csNote, String adminNote) {
        SupportTicket ticket =
                supportTicketRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.TICKET_NOT_EXISTED));
        
        // Get current user from security context
        var context = SecurityContextHolder.getContext();
        String currentUserEmail = context.getAuthentication().getName();
        User currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        
        String roleName = currentUser.getRole() != null ? currentUser.getRole().getName() : "";
        boolean isAdmin = "ADMIN".equals(roleName) || "STAFF".equals(roleName);
        boolean isCS = "CUSTOMER_SUPPORT".equals(roleName);
        
        // CSKH cập nhật csNote
        if (isCS && csNote != null) {
            ticket.setCsNote(csNote);
            ticket.setHandlerId(currentUser.getId());
        }
        
        // Admin cập nhật adminNote
        if (isAdmin && adminNote != null) {
            ticket.setAdminNote(adminNote);
        }
        
        ticket.setStatus(TicketStatus.RESOLVED);
        ticket.setUpdatedAt(LocalDateTime.now());
        SupportTicket saved = supportTicketRepository.save(ticket);
        return toResponseWithHandler(saved);
    }
}
