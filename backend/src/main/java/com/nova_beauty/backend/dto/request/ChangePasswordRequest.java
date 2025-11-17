package com.nova_beauty.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

import lombok.Data;

@Data
public class ChangePasswordRequest {
    @NotBlank(message = "Máº­t kháº©u hiá»‡n táº¡i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    private String currentPassword;

    @NotBlank(message = "Máº­t kháº©u má»›i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    private String newPassword;
}
