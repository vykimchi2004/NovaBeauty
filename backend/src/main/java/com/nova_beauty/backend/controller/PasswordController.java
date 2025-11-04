package com.nova_beauty.backend.controller;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
            @AuthenticationPrincipal UserDetails principal, @RequestBody @Valid ChangePasswordRequest request) {
        try {
            passwordService.changePasswordByEmail(
                    principal.getUsername(), request.getCurrentPassword(), request.getNewPassword());
            return ApiResponse.<String>builder()
                    .code(200)
                    .message("Password changed successfully")
                    .result("OK")
                    .build();
        } catch (Exception e) {
            log.error(
                    "Error changing password for user: {}", principal != null ? principal.getUsername() : "unknown", e);
            return ApiResponse.<String>builder()
                    .code(400)
                    .message(e.getMessage())
                    .result(null)
                    .build();
        }
    }
}
