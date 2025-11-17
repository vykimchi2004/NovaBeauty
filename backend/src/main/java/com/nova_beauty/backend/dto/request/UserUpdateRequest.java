package com.nova_beauty.backend.dto.request;

import com.nova_beauty.backend.validator.EmailConstraint;
import com.nova_beauty.backend.validator.PasswordConstraint;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserUpdateRequest {
    @PasswordConstraint
    String password;

    @EmailConstraint
    String email;

    String phoneNumber;
    String fullName;
    String address;
    String avatarUrl;
    Boolean isActive;

    String role;
}
