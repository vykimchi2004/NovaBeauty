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
    String sort_code; // Mã phân loại (VD: "sort_code":"19-60-06")
    String trans_type; // Loại vận chuyển (VD: "trans_type":"truck")
    String ward_encode;
    String district_encode;
    GhnShipmentFee fee; // Phí

    @JsonProperty("total_fee")
    Long total_fee; // Tổng phí dịch vụ

    @JsonProperty("expected_delivery_time")
    String expected_delivery_time; // Thời gian giao hàng dự kiến trả về từ GHN
}
