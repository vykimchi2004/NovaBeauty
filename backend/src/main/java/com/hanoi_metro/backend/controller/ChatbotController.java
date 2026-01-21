package com.hanoi_metro.backend.controller;

import com.hanoi_metro.backend.dto.request.ApiResponse;
import com.hanoi_metro.backend.dto.request.ChatRequest;
import com.hanoi_metro.backend.dto.response.ChatResponse;
import com.hanoi_metro.backend.service.ChatbotService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ChatbotController {

    ChatbotService chatbotService;

    @PostMapping("/ask")
    public ApiResponse<ChatResponse> ask(@Valid @RequestBody ChatRequest request) {
        log.info("Chatbot request received: {}", request.getMessage());
        ChatResponse response = chatbotService.ask(request);
        return ApiResponse.<ChatResponse>builder()
                .result(response)
                .build();
    }
}


