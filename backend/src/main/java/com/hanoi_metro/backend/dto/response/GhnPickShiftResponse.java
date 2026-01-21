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
public class GhnPickShiftResponse {
    Integer id;
    String title;

    @JsonProperty("from_time")
    Integer fromTime;

    @JsonProperty("to_time")
    Integer toTime;
}


