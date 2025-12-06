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
public class GhnLeadtimeResponse {
    Long leadtime;

    @JsonProperty("leadtime_order")
    GhnLeadtimeOrderResponse leadtimeOrder;
}


