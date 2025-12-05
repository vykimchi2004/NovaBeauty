package com.nova_beauty.backend.dto.request;

import jakarta.validation.constraints.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketCreationRequest {

    @NotBlank
    String orderCode;

    @NotBlank
    String customerName;

    @Email
    @NotBlank
    String email;

    @NotBlank
    String phone;

    // topic is optional - used when orderCode is 'KHAC' (Khác)
    String topic;

    @NotBlank
    String content;
}
