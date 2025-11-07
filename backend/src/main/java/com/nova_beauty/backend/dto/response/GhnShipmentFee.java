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
    Long main_service;
    Long insurance;
    Long station_do;
    Long station_pu;

    @JsonProperty("return")
    Long returnFee;

    Long r2s;
    Long coupon;

    @JsonProperty("cod_failed_fee")
    Long cod_failed_fee;
}


