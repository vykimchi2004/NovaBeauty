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
public class ReturnRequestRequest {

    /**
     * Lý do yêu cầu trả hàng: 'store' (lỗi từ cửa hàng) hoặc 'customer' (thay đổi nhu cầu)
     */
    String reasonType;

    /**
     * Mô tả chi tiết vấn đề
     */
    String description;

    /**
     * Email liên hệ
     */
    String email;

    /**
     * Địa chỉ gửi hàng trả lại
     */
    String returnAddress;

    /**
     * Phương thức hoàn tiền
     */
    String refundMethod;

    /**
     * Thông tin ngân hàng (nếu refundMethod là "Hoàn tiền bằng tài khoản ngân hàng")
     */
    String bank;
    String accountNumber;
    String accountHolder;

    /**
     * Danh sách ID các sản phẩm được chọn để trả hàng
     */
    List<String> selectedProductIds;

    /**
     * Danh sách URLs của các media (ảnh/video) đính kèm
     */
    List<String> mediaUrls;

    /**
     * Ghi chú bổ sung (tùy chọn, để tương thích với code cũ)
     */
    String note;
}


