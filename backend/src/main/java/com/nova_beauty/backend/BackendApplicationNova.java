package com.nova_beauty.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableFeignClients(basePackages = "com.nova_beauty.backend.client")
public class BackendApplicationNova {
    public static void main(String[] args) {
        SpringApplication.run(BackendApplicationNova.class, args);
    }
}
