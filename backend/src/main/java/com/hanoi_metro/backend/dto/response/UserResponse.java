package com.hanoi_metro.backend.dto.response;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserResponse {
    String id;
    String fullName;
    String email;
    String phoneNumber;
    String address;
    
    @JsonProperty("isActive")
    boolean active;
    
    // Getter for compatibility
    public boolean isActive() {
        return active;
    }
    
    LocalDate createAt;

    RoleResponse role;
}
