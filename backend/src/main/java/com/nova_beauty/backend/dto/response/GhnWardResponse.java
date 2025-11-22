package com.nova_beauty.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GhnWardResponse {
    @JsonProperty("WardCode")
    String wardCode;

    @JsonProperty("DistrictID")
    Integer districtID;

    @JsonProperty("WardName")
    String wardName;
}

