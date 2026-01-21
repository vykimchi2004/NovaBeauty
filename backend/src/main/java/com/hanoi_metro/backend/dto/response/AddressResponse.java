package com.hanoi_metro.backend.dto.response;

import java.time.LocalDateTime;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AddressResponse {
    String id;

    String recipientName;
    String recipientPhoneNumber;
    String provinceName;
    String provinceID;
    String districtName;
    String districtID;
    String wardName;
    String wardCode;

    String address;
    String postalCode;
    
    boolean defaultAddress;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

