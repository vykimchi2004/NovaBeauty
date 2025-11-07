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
public class GhnShipmentData {
    String order_code;
    String sort_code;
    String trans_type;
    String ward_encode;
    String district_encode;
    GhnShipmentFee fee;

    @JsonProperty("total_fee")
    Long total_fee;

    @JsonProperty("expected_delivery_time")
    String expected_delivery_time;
}


