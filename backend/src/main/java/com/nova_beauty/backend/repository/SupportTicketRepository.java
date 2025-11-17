package com.nova_beauty.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nova_beauty.backend.entity.SupportTicket;
import com.nova_beauty.backend.enums.TicketStatus;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, String> {
    List<SupportTicket> findByStatus(TicketStatus status);
    
    // Find all tickets ordered by createdAt descending (newest first)
    List<SupportTicket> findAllByOrderByCreatedAtDesc();
    
    // Find tickets by status ordered by createdAt descending (newest first)
    List<SupportTicket> findByStatusOrderByCreatedAtDesc(TicketStatus status);
}
