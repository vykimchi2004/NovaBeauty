package com.hanoi_metro.backend.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

// Tổng hợp báo cáo doanh thu: tổng doanh thu, tổng đơn hàng, giá trị trung bình.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RevenueSummary {
    Double totalRevenue; // Tổng doanh thu (chỉ tính đơn hàng đã thanh toán thành công)
    Long totalOrders; // Tổng số đơn hàng (chỉ tính đơn hàng đã thanh toán thành công)
    Double averageOrderValue; // Giá trị trung bình mỗi đơn hàng = totalRevenue / totalOrders
}


