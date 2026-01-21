package com.hanoi_metro.backend.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FinancialSummary {
    Double totalIncome; // Tổng thu (chủ yếu từ ORDER_PAYMENT)
    Double totalExpense; // Tổng chi (hoàn tiền, bồi thường, chi phí khác nếu có)
    Double profit; // Lợi nhuận = totalIncome - totalExpense
}


