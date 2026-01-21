package com.hanoi_metro.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableFeignClients(basePackages = "com.hanoi_metro.backend.client")
public class BackendApplicationMetro {
    public static void main(String[] args) {
        SpringApplication.run(BackendApplicationMetro.class, args);
    }
}
