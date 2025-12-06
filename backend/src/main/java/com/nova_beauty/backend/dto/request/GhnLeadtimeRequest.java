package com.nova_beauty.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GhnLeadtimeRequest {
    @JsonProperty("from_district_id")
    Integer fromDistrictId;

    @JsonProperty("from_ward_code")
    String fromWardCode;

    @JsonProperty("to_district_id")
    Integer toDistrictId;

    @JsonProperty("to_ward_code")
    String toWardCode;

    @JsonProperty("service_type_id")
    Integer serviceTypeId;
}



