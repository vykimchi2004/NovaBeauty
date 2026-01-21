package com.hanoi_metro.backend.exception;

import java.util.Map;
import java.util.Objects;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanoi_metro.backend.dto.response.CreateMomoResponse;

import feign.FeignException;

import jakarta.validation.ConstraintViolation;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.hanoi_metro.backend.dto.request.ApiResponse;

import lombok.extern.slf4j.Slf4j;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String MIN_ATTRIBUTE = "min";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @ExceptionHandler(value = FeignException.class)
    ResponseEntity<ApiResponse<?>> handleFeignException(FeignException exception) {
        log.error("FeignException occurred: status={}, message={}", exception.status(), exception.getMessage());
        
        String errorMessage = "Lỗi kết nối với dịch vụ thanh toán. Vui lòng thử lại sau.";
        
        // Cố gắng parse response body từ MoMo API để lấy message chi tiết
        try {
            String bodyString = exception.contentUTF8();
            if (bodyString != null && !bodyString.isEmpty()) {
                log.debug("MoMo API error response body: {}", bodyString);
                
                // Thử parse JSON response từ MoMo
                CreateMomoResponse momoResponse = objectMapper.readValue(bodyString, CreateMomoResponse.class);
                if (momoResponse != null && momoResponse.getMessage() != null && !momoResponse.getMessage().isEmpty()) {
                    errorMessage = "Lỗi thanh toán MoMo: " + momoResponse.getMessage();
                    log.info("Parsed MoMo error - resultCode: {}, message: {}", 
                            momoResponse.getResultCode(), momoResponse.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse MoMo error response: {}", e.getMessage());
        }
        
        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(ErrorCode.EXTERNAL_SERVICE_ERROR.getCode())
                .message(errorMessage)
                .build();
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(apiResponse);
    }

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
        // Sử dụng custom message từ exception nếu có, nếu không thì dùng message mặc định từ ErrorCode
        String message = exception.getMessage() != null && !exception.getMessage().equals(errorCode.getMessage())
                ? exception.getMessage()
                : errorCode.getMessage();
        ApiResponse<?> apiResponse = ApiResponse.builder()
                .code(errorCode.getCode())
                .message(message)
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

    @ExceptionHandler(value = NoResourceFoundException.class)
    ResponseEntity<?> handlingNoResourceFoundException(NoResourceFoundException exception) {
        // Log ở mức debug để tránh spam log khi frontend request ảnh không tồn tại
        log.debug("Resource not found: {}", exception.getResourcePath());
        // Trả về 404 không có body để browser có thể xử lý
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
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


            var constraintViolation = exception
                    .getBindingResult()
                    .getAllErrors()
                    .get(0) // Láº¥y lá»—i dáº§u tiÃªn
                    .unwrap(ConstraintViolation.class);


            attributes = constraintViolation.getConstraintDescriptor().getAttributes();

            log.info(attributes.toString());

        } catch (IllegalArgumentException ex) {

            if (exception.getFieldError() != null) {
                String validationMessage = exception.getFieldError().getDefaultMessage();
                String fieldName = exception.getFieldError().getField();
                log.warn("Validation error - field: {}, message: {}", fieldName, validationMessage);
                
                // Log tất cả validation errors để debug
                exception.getBindingResult().getAllErrors().forEach(error -> {
                    log.warn("Validation error detail: field={}, message={}", 
                        error instanceof org.springframework.validation.FieldError 
                            ? ((org.springframework.validation.FieldError) error).getField() 
                            : "unknown",
                        error.getDefaultMessage());
                });
                
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
            message = mapAttribute(message, attributes);
        }
        apiResponse.setMessage(message);

        return ResponseEntity.badRequest().body(apiResponse);
    }

    private String mapAttribute(String message, Map<String, Object> attributes) {
        String minValue = String.valueOf(attributes.get(MIN_ATTRIBUTE));

        return message.replace("{" + MIN_ATTRIBUTE + "}", minValue);

    }
}
