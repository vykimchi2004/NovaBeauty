package com.nova_beauty.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import lombok.Getter;

@Getter
public enum ErrorCode {
    // Lỗi không xác định được -> Internal server error
    // Lỗi liên quan input user -> Bad_request
    // Thực hiện request mà không thấy resource -> 404: not found
    // Không thể đăng nhập -> 401: unauthorized
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Uncategorized error", HttpStatus.BAD_REQUEST),
    USER_EXISTED(1002, "User existed", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1003, "INVALID_PASSWORD", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED(1004, "User không tồn tại", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED(1005, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    ACCOUNT_LOCKED(1006, "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "You do not have permission", HttpStatus.FORBIDDEN),
    INVALID_DOB(1008, "Your age must be as least {min}", HttpStatus.BAD_REQUEST),
    EMAIL_SEND_FAILED(1009, "Failed to send email", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_OTP(1010, "Mã OTP không đúng, yêu cầu nhập lại", HttpStatus.BAD_REQUEST),
    TICKET_NOT_EXISTED(1011, "Ticket không tồn tại", HttpStatus.NOT_FOUND),

    // Promotion
    PROMOTION_NOT_EXISTED(2001, "Khuyến mãi không tồn tại", HttpStatus.NOT_FOUND),
    PROMOTION_NOT_PENDING(2002, "Khuyến mãi không ở trạng thái chờ duyệt", HttpStatus.BAD_REQUEST),
    INVALID_PROMOTION_SCOPE(2003, "Phạm vi áp dụng khuyến mãi không hợp lệ", HttpStatus.BAD_REQUEST),
    PROMOTION_PRODUCT_CONFLICT(2004, "Một số sản phẩm đã có khuyến mãi đang hoạt động", HttpStatus.BAD_REQUEST),
    PROMOTION_CODE_ALREADY_EXISTS(2005, "Mã khuyến mãi đã tồn tại", HttpStatus.BAD_REQUEST),
    PROMOTION_OVERLAP_CONFLICT(2006, "Khuyến mãi trùng lặp với chương trình khác trong cùng khoảng thời gian", HttpStatus.BAD_REQUEST),

    // Voucher
    VOUCHER_NOT_EXISTED(3001, "Voucher không tồn tại", HttpStatus.NOT_FOUND),
    VOUCHER_CODE_ALREADY_EXISTS(3002, "Mã voucher đã tồn tại", HttpStatus.BAD_REQUEST),
    VOUCHER_NOT_PENDING(3003, "Voucher không ở trạng thái chờ duyệt", HttpStatus.BAD_REQUEST),
    VOUCHER_EXPIRED(3004, "Voucher đã hết hạn sử dụng", HttpStatus.BAD_REQUEST),
    VOUCHER_SOLD_OUT(3005, "Voucher đã hết lượt sử dụng", HttpStatus.BAD_REQUEST),
    INVALID_VOUCHER_MINIUM(3006, "Không thỏa mãn giá trị tối thiểu của voucher", HttpStatus.BAD_REQUEST),
    INVALID_VOUCHER_SCOPE(3007, "Phạm vi áp dụng voucher không hợp lệ", HttpStatus.BAD_REQUEST),
    VOUCHER_USAGE_LIMIT_EXCEEDED(3008, "Bạn đã sử dụng hết số lần được phép dùng voucher này", HttpStatus.BAD_REQUEST),
    VOUCHER_ALREADY_USED(3009, "Không thể áp dụng voucher", HttpStatus.BAD_REQUEST),

    // Banner
    BANNER_NOT_EXISTED(4001, "Banner không tồn tại", HttpStatus.NOT_FOUND),

    // REVIEW
    REVIEW_NOT_EXISTED(5001, "Review không tồn tại", HttpStatus.NOT_FOUND),
    REVIEW_NOT_PURCHASED(5002, "Bạn chưa mua sản phẩm này, không thể đánh giá", HttpStatus.BAD_REQUEST),
    REVIEW_ALREADY_EXISTS(5003, "Bạn đã đánh giá đơn hàng này rồi. Mỗi đơn hàng chỉ được đánh giá 1 lần", HttpStatus.BAD_REQUEST),

    // PRODUCT
    PRODUCT_NOT_EXISTED(6001, "Product không tồn tại", HttpStatus.NOT_FOUND),
    CATEGORY_NOT_EXISTED(6004, "Danh mục không tồn tại", HttpStatus.NOT_FOUND),
    CATEGORY_ALREADY_EXISTS(6005, "Mã danh mục hoặc tên danh mục đã tồn tại", HttpStatus.BAD_REQUEST),
    CATEGORY_HAS_PRODUCTS(6006, "Không thể xóa danh mục vì còn sản phẩm thuộc danh mục này", HttpStatus.BAD_REQUEST),
    CATEGORY_HAS_SUBCATEGORIES(6007, "Không thể xóa danh mục vì còn danh mục con", HttpStatus.BAD_REQUEST),
    CATEGORY_CANNOT_CHANGE_ID_HAS_CHILDREN(6008, "Không thể đổi ID danh mục. Vui lòng xóa danh mục con trước", HttpStatus.BAD_REQUEST),
    OUT_OF_STOCK(6002, "Hết hàng", HttpStatus.BAD_REQUEST),

    // ORDER - SHIPMENT - CART - ADDRESS
    CART_ITEM_NOT_EXISTED(7001, "Không tồn tại sản phẩm trong giỏ hàng", HttpStatus.NOT_FOUND),
    ORDER_NOT_EXISTED(7002, "Đơn hàng không tồn tại", HttpStatus.NOT_FOUND),
    EXTERNAL_SERVICE_ERROR(7003, "Lỗi kết nối dịch vụ vận chuyển", HttpStatus.BAD_GATEWAY),
    ADDRESS_NOT_EXISTED(7004, "Địa chỉ không tồn tại", HttpStatus.NOT_FOUND),
    SHIPMENT_NOT_EXISTED(7005, "Vận đơn không tồn tại", HttpStatus.NOT_FOUND),
    BAD_REQUEST(7006, "Yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),

    // FILE UPLOAD
    FILE_UPLOAD_FAILED(8001, "Không thể upload file", HttpStatus.INTERNAL_SERVER_ERROR),

    // NOTIFICATION
    NOTIFICATION_NOT_EXISTED(9001, "Thông báo không tồn tại", HttpStatus.NOT_FOUND);

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;
}
