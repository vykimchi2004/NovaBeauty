package com.nova_beauty.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.request.TicketCreationRequest;
import com.nova_beauty.backend.dto.request.TicketUpdateRequest;
import com.nova_beauty.backend.dto.response.TicketResponse;
import com.nova_beauty.backend.service.TicketService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @PostMapping
    public ApiResponse<TicketResponse> create(@Valid @RequestBody TicketCreationRequest request) {
        return ApiResponse.<TicketResponse>builder()
                .result(ticketService.create(request))
                .build();
    }

    @GetMapping
    public ApiResponse<List<TicketResponse>> list() {
        return ApiResponse.<List<TicketResponse>>builder()
                .result(ticketService.listAll())
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<TicketResponse> getById(@PathVariable String id) {
        return ApiResponse.<TicketResponse>builder()
                .result(ticketService.getById(id))
                .build();
    }

    @PatchMapping("/{id}")
    public ApiResponse<TicketResponse> update(@PathVariable String id, @RequestBody TicketUpdateRequest request) {
        return ApiResponse.<TicketResponse>builder()
                .result(ticketService.update(id, request))
                .build();
    }

    @PostMapping("/{id}/escalate")
    public ApiResponse<TicketResponse> escalate(@PathVariable String id) {
        return ApiResponse.<TicketResponse>builder()
                .result(ticketService.escalate(id))
                .build();
    }

    @PostMapping("/{id}/resolve")
    public ApiResponse<TicketResponse> resolve(
            @PathVariable String id, @RequestBody(required = false) TicketUpdateRequest request) {
        String note = request != null ? request.getHandlerNote() : null;
        return ApiResponse.<TicketResponse>builder()
                .result(ticketService.resolve(id, note))
                .build();
    }
}


