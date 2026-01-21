package com.hanoi_metro.backend.dto.response;


import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GhnProvinceResponse {
    @JsonProperty("ProvinceID")
    Integer provinceID;

    @JsonProperty("ProvinceName")
    String provinceName;

    @JsonProperty("Code")
    String code;
}

