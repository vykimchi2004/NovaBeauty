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
    String sort_code; // MÃ£ phÃ¢n loáº¡i (VD: "sort_code":"19-60-06")
    String trans_type; // Loáº¡i váº­n chuyá»ƒn (VD: "trans_type":"truck")
    String ward_encode;
    String district_encode;
    GhnShipmentFee fee; // PhÃ­

    @JsonProperty("total_fee")
    Long total_fee; // Tá»•ng phÃ­ dá»‹ch vá»¥

    @JsonProperty("expected_delivery_time")
    String expected_delivery_time; // Thá»i gian giao hÃ ng dá»± kiáº¿n tráº£ vá» tá»« GHN
}
