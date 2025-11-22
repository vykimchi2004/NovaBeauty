package com.nova_beauty.backend.dto.request;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GhnShippingFeeRequest {
    Integer serviceId;
    Integer insuranceValue;
    Integer coupon;
    Integer fromDistrictId;
    Integer fromWardCode;
    Integer toDistrictId;
    Integer toWardCode;
    Integer weight;
    Integer length;
    Integer width;
    Integer height;
}

