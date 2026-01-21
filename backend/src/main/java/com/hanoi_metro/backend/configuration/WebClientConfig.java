package com.hanoi_metro.backend.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient ghnWebClient(GhnProperties ghnProperties) {
        return WebClient.builder()
                .baseUrl(ghnProperties.getBaseUrl())
                .build();
    }
}

