package com.nova_beauty.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RejectRefundRequest {
    @NotBlank(message = "Lý do từ chối không được để trống")
    private String reason;

    /**
     * Nguồn từ chối: CSKH hoặc STAFF. Có thể null để tương thích dữ liệu cũ.
     */
    private String source;
}


