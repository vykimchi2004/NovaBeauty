package com.hanoi_metro.backend.dto.request;

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

    @NotNull(message = "ID khuyến mãi không được để trống")
    private String promotionId;

    @NotBlank(message = "Hành động không được để trống")
    @Pattern(regexp = "^(APPROVE|REJECT)$", message = "Hành động phải là APPROVE hoặc REJECT")
    private String action;

    private String reason; // Lý do từ chối (nếu action = REJECT)
}
