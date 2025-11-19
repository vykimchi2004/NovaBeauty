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
public class ApproveVoucherRequest {

    @NotNull(message = "ID voucher khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    private String voucherId;

    @NotBlank(message = "HÃ nh Ä‘á»™ng khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Pattern(regexp = "^(APPROVE|REJECT)$", message = "HÃ nh Ä‘á»™ng pháº£i lÃ  APPROVE hoáº·c REJECT")
    private String action;

    private String reason;
}


