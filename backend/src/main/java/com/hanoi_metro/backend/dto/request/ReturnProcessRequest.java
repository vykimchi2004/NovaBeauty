package com.hanoi_metro.backend.dto.request;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnProcessRequest {
    /**
     * Optional internal note from CSKH / Staff / Admin when processing the return.
     */
    private String note;

    /**
     * Refund amount decided at the current processing step (e.g. staff inspection result).
     */
    private Double refundAmount;

    /**
     * Date when the warehouse/staff actually received the return package.
     */
    private LocalDate returnCheckedDate;
}


