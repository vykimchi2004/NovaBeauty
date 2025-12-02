package com.nova_beauty.backend.dto.response;

import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderPageResponse {
    // Danh sách đơn hàng trong trang hiện tại
    List<OrderResponse> orders;

    // Tổng số đơn hàng
    Long totalElements;

    // Tổng số trang
    Integer totalPages;

    // Trang hiện tại (0-based)
    Integer currentPage;

    // Số phần tử mỗi trang
    Integer pageSize;

    // Có trang tiếp theo không
    Boolean hasNext;

    // Có trang trước đó không
    Boolean hasPrevious;
}


