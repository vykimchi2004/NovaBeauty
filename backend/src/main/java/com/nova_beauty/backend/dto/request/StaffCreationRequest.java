package com.nova_beauty.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

import com.nova_beauty.backend.validator.EmailConstraint;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffCreationRequest {
    @NotBlank(message = "FULL_NAME_REQUIRED")
    String fullName;

    @NotBlank(message = "EMAIL_REQUIRED")
    @EmailConstraint
    String email;

    String phoneNumber;
    String address;

    @NotBlank(message = "ROLE_REQUIRED")
    String roleName;

    @Builder.Default
    boolean isActive = true;
}
