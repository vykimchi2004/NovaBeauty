package com.nova_beauty.backend.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class GhnShipmentResponse {
    Integer code;
    String message;
    String message_display;
    GhnShipmentData data;
}
