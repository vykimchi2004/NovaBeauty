package com.nova_beauty.backend.controller;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.nova_beauty.backend.dto.request.UserCreationRequest;
import com.nova_beauty.backend.dto.response.UserResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@SpringBootTest // Chạy toàn bộ context của Spring Boot (như chạy thật trong ứng dụng, nhưng trong môi trường test)
@AutoConfigureMockMvc
// Cho phép sử dụng MockMvc để giả lập gửi request HTTP tới API controller (mà không cần bật server thật)
@Testcontainers
public class UserControllerIntergrationTest {
    // Mỗi khi chạy 1 test sẽ init container này
    @Container
    static final MySQLContainer<?> MY_SQL_CONTAINER = new MySQLContainer<>("mysql:8.0");

    @DynamicPropertySource
    static void configureDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MY_SQL_CONTAINER::getJdbcUrl);
        registry.add("spring.datasource.username", MY_SQL_CONTAINER::getUsername);
        registry.add("spring.datasource.password", MY_SQL_CONTAINER::getPassword);
        registry.add("spring.datasource.driverClassName", () -> "com.mysql.cj.jdbc.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
    }

    @Autowired
    private MockMvc mockMvc; // Công cụ để giả lập gửi HTTP request và kiểm tra response

    private UserCreationRequest request;
    private UserResponse userResponse;
    private LocalDate dob;

    @BeforeEach
    // Trước mỗi testcase sẽ chạy hàm này
    void initData() {
        dob = LocalDate.of(1990, 1, 1);

        request = UserCreationRequest.builder()
                .email("john@example.com")
                .fullName("John Doe")
                .address("123 Main St")
                .password("12345678")
                .build();

        userResponse = UserResponse.builder()
                .id("2b02565661d3")
                .email("john@example.com")
                .fullName("John Doe")
                .address("123 Main St")

                .createAt(LocalDate.now())
                .build();
    }

    // 1 test gồm 3 phần: GIVEN, WHEN, THEN
    @Test
    void createUser_validRequest_success() throws Exception {
        log.info("hello test");
        /// GIVEN = Chuẩn bị
        // Đã tạo ở trên: request, response
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        // Biến request được convert thành JSON String (content)
        String content = objectMapper.writeValueAsString(request);

        /// WHEN = Thực hiện hành động
        // Giả lập gọi API POST /users với body = JSON request
        var response = mockMvc.perform(MockMvcRequestBuilders.post("/users")
                        .contentType(MediaType.APPLICATION_JSON_VALUE)
                        .content(content))

                /// THEN = Kiểm tra kết quả
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("code").value(1000))
                .andExpect(MockMvcResultMatchers.jsonPath("result.username").value("john"))
                .andExpect(MockMvcResultMatchers.jsonPath("result.email").value("john@example.com"))
                .andExpect(MockMvcResultMatchers.jsonPath("result.fullName").value("John Doe"));
        log.info("Results: {}", response.andReturn().getResponse().getContentAsString());
    }
}
