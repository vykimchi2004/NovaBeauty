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
    USERNAME_INVALID(1003, "Username must be at least {min} characters", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1004, "INVALID_PASSWORD", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED(1005, "User not existed", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED(1006, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "You do not have permission", HttpStatus.FORBIDDEN),
    INVALID_DOB(1008, "Your age must be as least {min}", HttpStatus.BAD_REQUEST),
    EMAIL_SEND_FAILED(1009, "Failed to send email", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_OTP(1010, "Mã OTP không đúng, yêu cầu nhập lại", HttpStatus.BAD_REQUEST),

    // Promotion
    PROMOTION_NOT_EXISTED(2001, "Khuyến mãi không tồn tại", HttpStatus.NOT_FOUND),
    PROMOTION_CODE_ALREADY_EXISTS(2002, "Mã khuyến mãi đã tồn tại", HttpStatus.BAD_REQUEST),
    PROMOTION_NOT_PENDING(2003, "Khuyến mãi không ở trạng thái chờ duyệt", HttpStatus.BAD_REQUEST),
    CATEGORY_NOT_EXISTED(2004, "Danh mục không tồn tại", HttpStatus.NOT_FOUND),
    PRODUCT_NOT_EXISTED(2005, "Sản phẩm không tồn tại", HttpStatus.NOT_FOUND),

    // Banner
    BANNER_NOT_EXISTED(3001, "Banner không tồn tại", HttpStatus.NOT_FOUND),

    // REVIEW
    REVIEW_NOT_EXISTED(4001, "Review không tồn tại", HttpStatus.NOT_FOUND),
    ;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;
}
