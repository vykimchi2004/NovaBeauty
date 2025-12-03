package com.nova_beauty.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import com.nova_beauty.backend.validator.PasswordConstraint;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ResetPasswordRequest {
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email sai Ä‘á»‹nh dáº¡ng")
    String email;

    @NotBlank
    String otp;

    @NotBlank(message = "INVALID_PASSWORD")
    @PasswordConstraint
    String newPassword;
}
