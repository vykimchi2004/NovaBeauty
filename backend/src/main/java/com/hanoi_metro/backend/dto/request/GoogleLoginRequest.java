package com.hanoi_metro.backend.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GoogleLoginRequest {
    String idToken; // Google ID token từ client
    String email; // Email từ Google (backup)
    String fullName; // Tên từ Google
}







