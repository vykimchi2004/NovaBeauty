package com.nova_beauty.backend.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DirectCheckoutRequest {

    /**
     * ID của sản phẩm muốn mua ngay.
     */
    String productId;

    /**
     * Số lượng sản phẩm (mặc định 1).
     */
    Integer quantity;

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
     * Phương thức thanh toán khách chọn (momo | cod).
     */
    String paymentMethod;
}

