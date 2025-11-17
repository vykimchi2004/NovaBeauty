package com.nova_beauty.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovePromotionRequest {

    @NotNull(message = "ID khuyáº¿n mÃ£i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    private String promotionId;

    @NotBlank(message = "HÃ nh Ä‘á»™ng khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Pattern(regexp = "^(APPROVE|REJECT)$", message = "HÃ nh Ä‘á»™ng pháº£i lÃ  APPROVE hoáº·c REJECT")
    private String action;

    private String reason; // LÃ½ do tá»« chá»‘i (náº¿u action = REJECT)
}
