package com.nova_beauty.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class GhnShipmentFee {
    Long main_service; // Phí vận chuyển.
    Long insurance; // Giá trị của đơn hàng ( Trường hợp mất hàng , bể hàng sẽ đền theo giá trị của đơn hàng).
    Long station_do; // Phí gửi hàng tại bưu cục
    Long station_pu; // Phí lấy hàng tại bưu cục.

    @JsonProperty("return")
    Long returnFee;

    Long r2s; // Phí giao lại hàng.
    Long coupon;

    @JsonProperty("cod_failed_fee")
    Long cod_failed_fee; // set bằng 0.
}
