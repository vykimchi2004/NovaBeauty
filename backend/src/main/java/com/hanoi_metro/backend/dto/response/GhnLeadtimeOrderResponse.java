package com.hanoi_metro.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GhnLeadtimeOrderResponse {
    @JsonProperty("from_estimate_date")
    String fromEstimateDate;

    @JsonProperty("to_estimate_date")
    String toEstimateDate;
}
