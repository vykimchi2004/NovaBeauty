package com.nova_beauty.backend.dto.request;

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
public class GhnCreateOrderRequest {
    @JsonProperty("payment_type_id")
    Integer paymentTypeId; // 1: sender, 2: receiver

    String note;

    @JsonProperty("required_note")
    String requiredNote; // CHOTHUHANG, CHOXEMHANGKHONGTHU, KHONGCHOXEMHANG

    @JsonProperty("return_phone")
    String returnPhone;

    @JsonProperty("client_order_code")
    String clientOrderCode;

    // Info người gửi (mặc định là info cửa hàng)
    @JsonProperty("from_name")
    String fromName;

    @JsonProperty("from_phone")
    String fromPhone;

    @JsonProperty("from_address")
    String fromAddress;

    @JsonProperty("from_ward_code")
    String fromWardCode;

    @JsonProperty("from_district_id")
    Integer fromDistrictId;

    @JsonProperty("from_province_id")
    Integer fromProvinceId;

    // Info người nhận
    @JsonProperty("to_name")
    String toName;

    @JsonProperty("to_phone")
    String toPhone;

    @JsonProperty("to_address")
    String toAddress;

    @JsonProperty("to_ward_code")
    String toWardCode;

    @JsonProperty("to_district_id")
    Integer toDistrictId;

    @JsonProperty("to_province_id")
    Integer toProvinceId;

    // Info bưu kiện
    @JsonProperty("cod_amount")
    Long codAmount;

    String content;

    Integer length;
    Integer width;
    Integer height;
    Integer weight;

    @JsonProperty("cod_failed_amount")
    Long codFailedAmount;

    @JsonProperty("pick_station_id")
    Integer pickStationId; // null

    @JsonProperty("deliver_station_id")
    Integer deliverStationId; // null

    @JsonProperty("insurance_value")
    Long insuranceValue;

    @JsonProperty("service_type_id")
    Integer serviceTypeId; // 2: light, 5: heavy

    String coupon; // null

    @JsonProperty("pickup_time")
    Long pickupTime; // Unix timestamp

    @JsonProperty("pick_shift")
    List<Integer> pickShift;

    // Items (for heavy service)
    List<GhnOrderItemRequest> items;
}



