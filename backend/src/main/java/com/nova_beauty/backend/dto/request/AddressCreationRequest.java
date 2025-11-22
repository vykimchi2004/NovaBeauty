package com.nova_beauty.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AddressCreationRequest {
    String id;

    @NotBlank(message = "Tên người nhận không được để trống")
    String recipientName;
    @NotBlank(message = "Số điện thoại người nhận không được để trống")
    String recipientPhoneNumber;
    @NotBlank(message = "Tên tỉnh/thành phố không được để trống")
    String provinceName;
    String provinceID;
    @NotBlank(message = "Tên quận/huyện không được để trống")
    String districtName;
    String districtID;
    @NotBlank(message = "Tên xã/phường không được để trống")
    String wardName;
    String wardCode;
    @NotBlank(message = "Địa chỉ không được để trống")
    String address;

    String postalCode;
    
    boolean defaultAddress;
}

