package com.hanoi_metro.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GhnDistrictResponse {
    @JsonProperty("DistrictID")
    Integer districtID;

    @JsonProperty("ProvinceID")
    Integer provinceID;

    @JsonProperty("DistrictName")
    String districtName;

    @JsonProperty("Code")
    String code;

    @JsonProperty("Type")
    Integer type;

    @JsonProperty("SupportType")
    Integer supportType;
}

