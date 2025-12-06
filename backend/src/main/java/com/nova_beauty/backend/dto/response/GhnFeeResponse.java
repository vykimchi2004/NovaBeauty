package com.nova_beauty.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GhnFeeResponse {
    Long total;

    @JsonProperty("service_fee")
    Long serviceFee;

    @JsonProperty("insurance_fee")
    Long insuranceFee;

    @JsonProperty("pick_station_fee")
    Long pickStationFee;

    @JsonProperty("coupon_value")
    Long couponValue;

    @JsonProperty("r2s_fee")
    Long r2sFee;

    @JsonProperty("return_again")
    Long returnAgain;

    @JsonProperty("document_return")
    Long documentReturn;

    @JsonProperty("double_check")
    Long doubleCheck;

    @JsonProperty("cod_fee")
    Long codFee;

    @JsonProperty("pick_remote_areas_fee")
    Long pickRemoteAreasFee;

    @JsonProperty("deliver_remote_areas_fee")
    Long deliverRemoteAreasFee;

    @JsonProperty("cod_failed_fee")
    Long codFailedFee;
}



