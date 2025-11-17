package com.nova_beauty.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import lombok.Getter;

@Getter
public enum ErrorCode {
    // Lá»—i khÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c -> Internal server error
    // Lá»—i liÃªn quan input user -> Bad_request
    // Thá»±c hiá»‡n request mÃ  khÃ´ng tháº¥y resource -> 404: not found
    // KhÃ´ng thá»ƒ Ä‘Äƒng nháº­p -> 401: unauthorized
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Uncategorized error", HttpStatus.BAD_REQUEST),
    USER_EXISTED(1002, "User existed", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1003, "INVALID_PASSWORD", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED(1004, "User khÃ´ng tá»“n táº¡i", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED(1005, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1006, "You do not have permission", HttpStatus.FORBIDDEN),
    INVALID_DOB(1007, "Your age must be as least {min}", HttpStatus.BAD_REQUEST),
    EMAIL_SEND_FAILED(1008, "Failed to send email", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_OTP(1009, "MÃ£ OTP khÃ´ng Ä‘Ãºng, yÃªu cáº§u nháº­p láº¡i", HttpStatus.BAD_REQUEST),
    TICKET_NOT_EXISTED(1010, "Ticket khÃ´ng tá»“n táº¡i", HttpStatus.NOT_FOUND),

    // Promotion
    PROMOTION_NOT_EXISTED(2001, "Khuyáº¿n mÃ£i khÃ´ng tá»“n táº¡i", HttpStatus.NOT_FOUND),
    PROMOTION_NOT_PENDING(2002, "Khuyáº¿n mÃ£i khÃ´ng á»Ÿ tráº¡ng thÃ¡i chá» duyá»‡t", HttpStatus.BAD_REQUEST),
    INVALID_PROMOTION_SCOPE(2003, "Pháº¡m vi Ã¡p dá»¥ng khuyáº¿n mÃ£i khÃ´ng há»£p lá»‡", HttpStatus.BAD_REQUEST),
    PROMOTION_PRODUCT_CONFLICT(2004, "Má»™t sá»‘ sáº£n pháº©m Ä‘Ã£ cÃ³ khuyáº¿n mÃ£i Ä‘ang hoáº¡t Ä‘á»™ng", HttpStatus.BAD_REQUEST),
    PROMOTION_CODE_ALREADY_EXISTS(2005, "MÃ£ khuyáº¿n mÃ£i Ä‘Ã£ tá»“n táº¡i", HttpStatus.BAD_REQUEST),

    // Voucher
    VOUCHER_NOT_EXISTED(3001, "Voucher khÃ´ng tá»“n táº¡i", HttpStatus.NOT_FOUND),
    VOUCHER_CODE_ALREADY_EXISTS(3002, "MÃ£ voucher Ä‘Ã£ tá»“n táº¡i", HttpStatus.BAD_REQUEST),
    VOUCHER_NOT_PENDING(3003, "Voucher khÃ´ng á»Ÿ tráº¡ng thÃ¡i chá» duyá»‡t", HttpStatus.BAD_REQUEST),
    VOUCHER_EXPIRED(3004, "Voucher Ä‘Ã£ háº¿t háº¡n sá»­ dá»¥ng", HttpStatus.BAD_REQUEST),
    VOUCHER_SOLD_OUT(3005, "Voucher Ä‘Ã£ háº¿t lÆ°á»£t sá»­ dá»¥ng", HttpStatus.BAD_REQUEST),
    INVALID_VOUCHER_MINIUM(3006, "KhÃ´ng thá»a mÃ£n giÃ¡ trá»‹ tá»‘i thiá»ƒu cá»§a voucher", HttpStatus.BAD_REQUEST),
    INVALID_VOUCHER_SCOPE(3007, "Pháº¡m vi Ã¡p dá»¥ng voucher khÃ´ng há»£p lá»‡", HttpStatus.BAD_REQUEST),
    VOUCHER_USAGE_LIMIT_EXCEEDED(3008, "Báº¡n Ä‘Ã£ sá»­ dá»¥ng háº¿t sá»‘ láº§n Ä‘Æ°á»£c phÃ©p dÃ¹ng voucher nÃ y", HttpStatus.BAD_REQUEST),

    // Banner
    BANNER_NOT_EXISTED(4001, "Banner khÃ´ng tá»“n táº¡i", HttpStatus.NOT_FOUND),

    // REVIEW
    REVIEW_NOT_EXISTED(5001, "Review khÃ´ng tá»“n táº¡i", HttpStatus.NOT_FOUND),

    // PRODUCT
    PRODUCT_NOT_EXISTED(6001, "Product khÃ´ng tá»“n táº¡i", HttpStatus.NOT_FOUND),
    CATEGORY_NOT_EXISTED(6004, "Danh má»¥c khÃ´ng tá»“n táº¡i", HttpStatus.NOT_FOUND),
    CATEGORY_ALREADY_EXISTS(6005, "MÃ£ danh má»¥c hoáº·c tÃªn danh má»¥c Ä‘Ã£ tá»“n táº¡i", HttpStatus.BAD_REQUEST),
    CATEGORY_HAS_PRODUCTS(6006, "KhÃ´ng thá»ƒ xÃ³a danh má»¥c vÃ¬ cÃ²n sáº£n pháº©m thuá»™c danh má»¥c nÃ y", HttpStatus.BAD_REQUEST),
    CATEGORY_HAS_SUBCATEGORIES(6007, "KhÃ´ng thá»ƒ xÃ³a danh má»¥c vÃ¬ cÃ²n danh má»¥c con", HttpStatus.BAD_REQUEST),
    OUT_OF_STOCK(6002, "Háº¿t hÃ ng", HttpStatus.BAD_REQUEST),

    // ORDER - SHIPMENT - CART
    CART_ITEM_NOT_EXISTED(7001, "KhÃ´ng tá»“n táº¡i sáº£n pháº©m trong giá» hÃ ng", HttpStatus.NOT_FOUND),
    ORDER_NOT_EXISTED(7002, "ÄÆ¡n hÃ ng khÃ´ng tá»“n táº¡i", HttpStatus.NOT_FOUND),
    EXTERNAL_SERVICE_ERROR(7003, "Lá»—i káº¿t ná»‘i dá»‹ch vá»¥ váº­n chuyá»ƒn", HttpStatus.BAD_GATEWAY),

    // FILE UPLOAD
    FILE_UPLOAD_FAILED(8001, "KhÃ´ng thá»ƒ upload file", HttpStatus.INTERNAL_SERVER_ERROR);

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;
}
