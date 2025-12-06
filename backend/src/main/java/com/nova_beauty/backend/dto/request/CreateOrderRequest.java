package com.nova_beauty.backend.dto.request;

import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateOrderRequest {

    /**
     * Snapshot đầy đủ của thông tin giao hàng (JSON string).
     */
    String shippingAddress;

    /**
     * ID của địa chỉ mà khách đã chọn (nếu có trong sổ địa chỉ).
     */
    String addressId;

    /**
     * Ghi chú đơn hàng từ phía khách hàng.
     */
    String note;

    /**
     * Phí vận chuyển (VND). Nếu null sẽ mặc định 0.
     */
    Double shippingFee;

    /**
     * Danh sách id của các CartItem được chọn để thanh toán.
     * Nếu null hoặc rỗng thì backend sẽ hiểu là thanh toán toàn bộ giỏ hàng.
     */
    List<String> cartItemIds;

    /**
     * Phương thức thanh toán khách chọn (momo | cod).
     */
    String paymentMethod;

    // Mã đơn hàng được tạo trước (dùng cho thanh toán MoMo để đảm bảo idempotent).
    String orderCode;
}

