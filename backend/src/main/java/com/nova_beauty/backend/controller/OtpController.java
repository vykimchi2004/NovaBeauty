package com.nova_beauty.backend.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.request.OtpVerificationRequest;
import com.nova_beauty.backend.repository.UserRepository;
import com.nova_beauty.backend.service.OtpService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class OtpController {

    OtpService otpService;
    UserRepository userRepository;

    @PostMapping("/send-otp")
    public ApiResponse<String> sendOtp(
            @RequestParam @NotBlank(message = "Email khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng") @Email(message = "Email sai Ä‘á»‹nh dáº¡ng")
                    String email,
            @RequestParam(required = false) String mode) {
        try {
            // Nếu ở chế độ đăng ký (register) và email đã tồn tại, không gửi OTP
            if ("register".equalsIgnoreCase(mode)
                    && userRepository.findByEmail(email).isPresent()) {
                return ApiResponse.<String>builder()
                        .code(400)
                        .message("Email đã được sử dụng")
                        .result(null)
                        .build();
            }

            // If in forgot mode and email doesn't exist, block sending OTP
            if ("forgot".equalsIgnoreCase(mode)
                    && !userRepository.findByEmail(email).isPresent()) {
                return ApiResponse.<String>builder()
                        .code(400)
                        .message("Email khÃ´ng tá»“n táº¡i trong há»‡ thá»‘ng")
                        .result(null)
                        .build();
            }

            String otpCode = otpService.generateAndSendOtp(email);
            return ApiResponse.<String>builder()
                    .code(200)
                    .message("OTP sent successfully to " + email)
                    .result(otpCode)
                    .build();
        } catch (Exception e) {
            log.error("Error sending OTP to email: {}", email, e);
            return ApiResponse.<String>builder()
                    .code(500)
                    .message("Failed to send OTP")
                    .result(null)
                    .build();
        }
    }

    @PostMapping("/verify-otp")
    public ApiResponse<String> verifyOtp(@RequestBody @Valid OtpVerificationRequest request) {
        try {
            boolean isValid = otpService.isValidOtp(request.getEmail(), request.getOtp());

            if (isValid) {
                return ApiResponse.<String>builder()
                        .code(200)
                        .message("OTP verified successfully")
                        .result("OTP is valid")
                        .build();
            } else {
                return ApiResponse.<String>builder()
                        .code(400)
                        .message("Invalid or expired OTP")
                        .result(null)
                        .build();
            }
        } catch (Exception e) {
            log.error("Error verifying OTP for email: {}", request.getEmail(), e);
            return ApiResponse.<String>builder()
                    .code(500)
                    .message("Failed to verify OTP")
                    .result(null)
                    .build();
        }
    }

    // reset-password endpoint moved to PasswordController
}
