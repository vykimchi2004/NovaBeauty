package com.hanoi_metro.backend.dto.request;


import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GhnOrderItemRequest {
    String name;
    String code;
    Integer quantity;
    Integer price;
    Integer length;
    Integer width;
    Integer height;
    Integer weight;
    GhnOrderItemCategoryRequest category;
}



