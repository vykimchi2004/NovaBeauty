package com.nova_beauty.backend.controller;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.request.ChangePasswordRequest;
import com.nova_beauty.backend.dto.request.ResetPasswordRequest;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.service.PasswordService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PasswordController {

    PasswordService passwordService;

    // Reset password using OTP (public)
    @PostMapping("/reset-password")
    public ApiResponse<String> resetPassword(@RequestBody @Valid ResetPasswordRequest request) {
        try {
            passwordService.resetPasswordByOtp(request.getEmail(), request.getOtp(), request.getNewPassword());
            return ApiResponse.<String>builder()
                    .code(200)
                    .message("Password reset successfully")
                    .result("OK")
                    .build();
        } catch (Exception e) {
            log.error("Error resetting password for email: {}", request.getEmail(), e);
            return ApiResponse.<String>builder()
                    .code(400)
                    .message(e.getMessage())
                    .result(null)
                    .build();
        }
    }

    // Change password for logged-in user (requires authentication)
    @PostMapping("/change-password")
    public ApiResponse<String> changePassword(
            @AuthenticationPrincipal Jwt jwt, @RequestBody @Valid ChangePasswordRequest request) {
        if (jwt == null) {
            return ApiResponse.<String>builder()
                    .code(401)
                    .message("Unauthenticated")
                    .result(null)
                    .build();
        }
        String email = jwt.getSubject();
        // AppException sẽ được xử lý bởi GlobalExceptionHandler
        passwordService.changePasswordByEmail(
                email, request.getCurrentPassword(), request.getNewPassword());
        return ApiResponse.<String>builder()
                .code(200)
                .message("Password changed successfully")
                .result("OK")
                .build();
    }

    // Check if email is Google login user
    @GetMapping("/check-google-user")
    public ApiResponse<Boolean> checkGoogleUser(@RequestParam String email) {
        try {
            boolean isGoogleUser = passwordService.isGoogleUser(email);
            return ApiResponse.<Boolean>builder()
                    .code(200)
                    .message("Success")
                    .result(isGoogleUser)
                    .build();
        } catch (Exception e) {
            log.error("Error checking Google user for email: {}", email, e);
            return ApiResponse.<Boolean>builder()
                    .code(400)
                    .message(e.getMessage())
                    .result(false)
                    .build();
        }
    }

    // Set password for Google user (public endpoint, requires OTP)
    @PostMapping("/set-password-google")
    public ApiResponse<String> setPasswordForGoogleUser(@RequestBody @Valid ResetPasswordRequest request) {
        try {
            passwordService.setPasswordForGoogleUser(request.getEmail(), request.getOtp(), request.getNewPassword());
            return ApiResponse.<String>builder()
                    .code(200)
                    .message("Password set successfully")
                    .result("OK")
                    .build();
        } catch (Exception e) {
            log.error("Error setting password for Google user: {}", request.getEmail(), e);
            return ApiResponse.<String>builder()
                    .code(400)
                    .message(e.getMessage())
                    .result(null)
                    .build();
        }
    }
}
