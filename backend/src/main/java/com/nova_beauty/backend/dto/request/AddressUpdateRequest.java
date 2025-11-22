package com.nova_beauty.backend.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AddressUpdateRequest {
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
}

