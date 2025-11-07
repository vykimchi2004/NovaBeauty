package com.nova_beauty.backend.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class CreateGhnShipmentItem {
    String name;
    Integer quantity;
    Integer price;
    Integer weight;
}


