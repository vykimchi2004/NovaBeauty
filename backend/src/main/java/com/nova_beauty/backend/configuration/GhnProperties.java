package com.nova_beauty.backend.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "ghn")
public class GhnProperties {
    private String token;
    private Integer shopId;
    private String baseUrl;
}
