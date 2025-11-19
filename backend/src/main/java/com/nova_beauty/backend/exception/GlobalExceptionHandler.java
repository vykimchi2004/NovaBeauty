package com.nova_beauty.backend.exception;

import java.util.Map;
import java.util.Objects;

import jakarta.validation.ConstraintViolation;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import com.nova_beauty.backend.dto.request.ApiResponse;

import lombok.extern.slf4j.Slf4j;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String MIN_ATTRIBUTE = "min";

    @ExceptionHandler(value = Exception.class)
    ResponseEntity<ApiResponse<?>> handleException(Exception exception) {
        log.error("Exception", exception);
        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode())
                .message(ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage())
                .build();
        return ResponseEntity.badRequest().body(apiResponse);
    }

    @ExceptionHandler(value = AppException.class)
    ResponseEntity<ApiResponse<?>> handlingAppException(AppException exception) {
        ErrorCode errorCode = exception.getErrorCode();
        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();
        return ResponseEntity.status(errorCode.getStatusCode()).body(apiResponse);
    }

    @ExceptionHandler(value = AccessDeniedException.class)
    ResponseEntity<ApiResponse<?>> handlingAccessDeniedException(AccessDeniedException exception) {
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        return ResponseEntity.status(errorCode.getStatusCode())
                .body(ApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(value = MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse<?>> handlingValidation(MethodArgumentNotValidException exception) {
        String enumKey = (exception.getFieldError() != null)
                ? exception.getFieldError().getDefaultMessage() // tráº£ vá» thÃ´ng bÃ¡o lá»—i gáº¯n trong annotation(message)
                : ErrorCode.INVALID_KEY.name();

        ErrorCode errorCode = ErrorCode.INVALID_KEY;

        Map<String, Object> attributes = null;

        try {
            errorCode = ErrorCode.valueOf(enumKey);

            // getBindingResult lÃ  nhá»¯ng error mÃ  method MethodArgumentNotValidException wrap láº¡i
            var constraintViolation = exception
                    .getBindingResult()
                    .getAllErrors()
                    .get(0) // Láº¥y lá»—i dáº§u tiÃªn
                    .unwrap(ConstraintViolation.class);

            // getConstraintDescriptor: get ná»™i dung nhá»¯ng annotation
            // getAttributes: láº¥y Map cÃ¡c tham sá»‘ trong annotation. VD: {min=3, message="USERNAME_TOO_SHORT", ...}
            attributes = constraintViolation.getConstraintDescriptor().getAttributes();

            log.info(attributes.toString());

        } catch (IllegalArgumentException ex) {
            // Náº¿u khÃ´ng tÃ¬m tháº¥y ErrorCode enum, sá»­ dá»¥ng message tá»« validation annotation
            if (exception.getFieldError() != null) {
                String validationMessage = exception.getFieldError().getDefaultMessage();
                log.warn("Validation error - field: {}, message: {}", 
                    exception.getFieldError().getField(), validationMessage);
                ApiResponse<?> apiResponse = new ApiResponse();
                apiResponse.setCode(ErrorCode.INVALID_KEY.getCode());
                apiResponse.setMessage(validationMessage);
                return ResponseEntity.badRequest().body(apiResponse);
            }
        }

        ApiResponse<?> apiResponse = new ApiResponse();

        apiResponse.setCode(errorCode.getCode());
        String message = errorCode.getMessage();
        if (Objects.nonNull(attributes) && message != null && message.contains("{")) {
            message = mapAttribute(message, attributes); // thay {min} náº¿u cÃ³
        }
        apiResponse.setMessage(message);

        return ResponseEntity.badRequest().body(apiResponse);
    }

    private String mapAttribute(String message, Map<String, Object> attributes) {
        String minValue = String.valueOf(attributes.get(MIN_ATTRIBUTE));

        return message.replace("{" + MIN_ATTRIBUTE + "}", minValue);
        // cáº·p {} Ä‘á»ƒ
        // 1. TrÃ¡nh nháº§m láº«n vá»›i message thÃ´ng thÆ°á»ng;
        // 2. ÄÃ¢y lÃ  1 chuáº©n cá»§a java khi replay 1 chuá»—i
    }
}
