package com.hanoi_metro.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class MomoIpnRequest {
    private String partnerCode;
    private String accessKey;
    private String orderId;
    private String orderInfo;
    private String orderType;
    private String requestId;
    private Long transId;
    private Long amount;
    private Integer resultCode;
    private String message;
    private String localMessage;
    private Long responseTime;
    private String payType;
    private String extraData;
    private String signature;
}

