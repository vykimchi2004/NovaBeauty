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
    String orderId;

    // GHN required fields
    Integer payment_type_id; // 1: sender, 2: receiver
    String required_note; // CHOTHUHANG, CHOXEMHANGKHONGTHU, KHONGCHOXEMHANG
    Integer service_type_id; // 2 or 5

    // Sender info
    String from_name;
    String from_phone;
    String from_address;
    String from_ward_name;
    String from_district_name;
    String from_province_name;

    // Receiver info
    String to_name;
    String to_phone;
    String to_address;
    String to_ward_name;
    String to_district_name;
    String to_province_name;

    // Parcel info
    Integer length;
    Integer width;
    Integer height;
    Integer weight;
    Long cod_amount; // VND
    String note;

    // Items (for heavy service)
    List<CreateGhnShipmentItem> items;
}
