package com.hanoi_metro.backend.dto.request;

import com.hanoi_metro.backend.validator.EmailConstraint;
import com.hanoi_metro.backend.validator.PasswordConstraint;

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
    Boolean isActive;

    String role;
}
