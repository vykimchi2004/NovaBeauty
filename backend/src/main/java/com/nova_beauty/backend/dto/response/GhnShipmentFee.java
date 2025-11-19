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
public class GhnShipmentFee {
    Long main_service; // PhÃ­ váº­n chuyá»ƒn.
    Long insurance; // GiÃ¡ trá»‹ cá»§a Ä‘Æ¡n hÃ ng ( TrÆ°á»ng há»£p máº¥t hÃ ng , bá»ƒ hÃ ng sáº½ Ä‘á»n theo giÃ¡ trá»‹ cá»§a Ä‘Æ¡n hÃ ng).
    Long station_do; // PhÃ­ gá»­i hÃ ng táº¡i bÆ°u cá»¥c
    Long station_pu; // PhÃ­ láº¥y hÃ ng táº¡i bÆ°u cá»¥c.

    @JsonProperty("return")
    Long returnFee;

    Long r2s; // PhÃ­ giao láº¡i hÃ ng.
    Long coupon;

    @JsonProperty("cod_failed_fee")
    Long cod_failed_fee; // set báº±ng 0.
}
