package com.nova_beauty.backend.dto.request;

import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class CreateGhnShipmentRequest {
    String orderCode;

    Integer payment_type_id;
    String required_note;
    Integer service_type_id;

    String from_name;
    String from_phone;
    String from_address;
    String from_ward_name;
    String from_district_name;
    String from_province_name;

    String to_name;
    String to_phone;
    String to_address;
    String to_ward_name;
    String to_district_name;
    String to_province_name;

    Integer length;
    Integer width;
    Integer height;
    Integer weight;
    Long cod_amount;
    String note;

    List<CreateGhnShipmentItem> items;
}


