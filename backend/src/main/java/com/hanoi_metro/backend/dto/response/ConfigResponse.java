package com.hanoi_metro.backend.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConfigResponse {
    String apiBaseUrl;
    String ghnBaseUrl;
    String contextPath;
    Integer port;
}

