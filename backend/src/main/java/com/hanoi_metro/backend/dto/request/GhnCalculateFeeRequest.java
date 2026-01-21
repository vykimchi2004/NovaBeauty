package com.hanoi_metro.backend.dto.request;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GhnCalculateFeeRequest {
    @JsonProperty("service_type_id")
    Integer serviceTypeId; // 2 or 5

    @JsonProperty("insurance_value")
    Long insuranceValue;

    String coupon; // null

    @JsonProperty("from_district_id")
    Integer fromDistrictId;

    @JsonProperty("from_ward_code")
    String fromWardCode;

    @JsonProperty("to_district_id")
    Integer toDistrictId;

    @JsonProperty("to_ward_code")
    String toWardCode;

    // For light service
    Integer length;
    Integer width;
    Integer height;
    Integer weight;

    // For heavy service (items)
    List<GhnOrderItemRequest> items;
}



