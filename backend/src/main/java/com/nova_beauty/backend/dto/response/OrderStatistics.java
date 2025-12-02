package com.nova_beauty.backend.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderStatistics {
    // Tổng số đơn hàng trong khoảng thời gian
    Long totalOrders;

    // Số đơn hàng bị hủy (status = CANCELLED)
    Long cancelledOrders;

    // Số đơn hàng đã hoàn tiền (status = REFUNDED)
    Long refundedOrders;
}


