package com.nova_beauty.backend.controller;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.request.ChangePasswordRequest;
import com.nova_beauty.backend.dto.request.ResetPasswordRequest;
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
        try {
            if (jwt == null) {
                return ApiResponse.<String>builder()
                        .code(401)
                        .message("Unauthenticated")
                        .result(null)
                        .build();
            }
            String email = jwt.getSubject();
            passwordService.changePasswordByEmail(
                    email, request.getCurrentPassword(), request.getNewPassword());
            return ApiResponse.<String>builder()
                    .code(200)
                    .message("Password changed successfully")
                    .result("OK")
                    .build();
        } catch (Exception e) {
            log.error(
                    "Error changing password for user: {}", jwt != null ? jwt.getSubject() : "unknown", e);
            return ApiResponse.<String>builder()
                    .code(400)
                    .message(e.getMessage())
                    .result(null)
                    .build();
        }
    }
}
