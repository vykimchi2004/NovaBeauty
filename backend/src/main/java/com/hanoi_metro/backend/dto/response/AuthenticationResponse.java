package com.hanoi_metro.backend.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthenticationResponse {
    String token;          // Access token (ngắn hạn)
    String refreshToken;   // Refresh token (dài hạn)
    boolean authenticated;
}
