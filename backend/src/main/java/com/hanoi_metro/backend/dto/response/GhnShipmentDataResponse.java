package com.hanoi_metro.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GhnShipmentDataResponse {
    String order_code;
    String sort_code;
    String trans_type;
    String ward_encode;
    String district_encode;
    GhnShipmentFeeResponse fee;

    @JsonProperty("total_fee")
    Long total_fee;

    @JsonProperty("expected_delivery_time")
    String expected_delivery_time;
}
