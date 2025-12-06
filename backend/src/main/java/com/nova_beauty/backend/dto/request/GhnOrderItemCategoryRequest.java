package com.nova_beauty.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GhnOrderItemCategoryRequest {
    @JsonProperty("level1")
    String level1;

    @JsonProperty("level2")
    String level2;

    @JsonProperty("level3")
    String level3;
}
