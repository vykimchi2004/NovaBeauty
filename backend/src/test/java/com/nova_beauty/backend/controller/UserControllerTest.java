package com.nova_beauty.backend.controller;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.nova_beauty.backend.dto.request.UserCreationRequest;
import com.nova_beauty.backend.dto.response.UserResponse;
import com.nova_beauty.backend.service.UserService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@SpringBootTest // Chạy toàn bộ context của Spring Boot (như chạy thật trong ứng dụng, nhưng trong môi trường test)
@AutoConfigureMockMvc // Cho phép sử dụng MickMvc để giả lập gửi request HTTP tới API controller (mà không cần bật
// server thật)f
@TestPropertySource(
        "/test.properties") // override cấu hình mặc định bằng file khác dành riêng cho test case thay vì sử dụng như
// mặc định: application.properties hoặc application.yml
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc; // Công cụ để giả lập gửi HTTP request và kiểm tra response

    // @MockitoBean // Tạo 1 mock (phiên bản giả) của UserService
    @MockBean
    private UserService userService;

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
                .isActive(true)
                .createAt(LocalDate.now())
                .build();
    }

    // 1 test gồm 3 phần: GIVEN, WHEN, THEN
    @Test
    void createUser_validRequest_success() throws Exception {
        log.info("hello test");
        // GIVEN = Chuẩn bị
        // Đã tạo ở trên: request, response
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        // Biến request được convert thành JSON String (content)
        String content = objectMapper.writeValueAsString(request);

        Mockito.when(userService.createUser(ArgumentMatchers.any())).thenReturn(userResponse);

        // WHEN = Thực hiện hành động
        // Giả lập gọi API POST /users với body = JSON request
        mockMvc.perform(MockMvcRequestBuilders.post("/users")
                        .contentType(MediaType.APPLICATION_JSON_VALUE)
                        .content(content))

                // THEN = Kiểm tra kết quả
                /*
                 * HTTP status phải là 200 OK
                 * JSON trả về phải có:
                 * "code" = 1000
                 * "result.id" = "2b02565661d3"
                 * nếu khớp -> test pass
                 * nếu sai -> test fail
                 */
                .andExpect(MockMvcResultMatchers.status().isOk())
                .andExpect(MockMvcResultMatchers.jsonPath("code").value(1000))
                .andExpect(
                        MockMvcResultMatchers.jsonPath("result.id").value("2b02565661d3")
                        // nếu cẩn thận có thể thêm các trường username, firstname, lastname,... để đảm bảo đúng
                        );
    }

    @Test
    void createUser_usernameInvalid_fail() throws Exception {
        // GIVEN
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        String content = objectMapper.writeValueAsString(request);

        // WHEN
        mockMvc.perform(
                        MockMvcRequestBuilders // Tạo request
                                .post("/users")
                                .contentType(MediaType.APPLICATION_JSON_VALUE)
                                .content(content))
                // THEN
                .andExpect(MockMvcResultMatchers.status().isBadRequest())
                .andExpect(MockMvcResultMatchers.jsonPath("code").value(1003))
                .andExpect(MockMvcResultMatchers.jsonPath("message").value("Username must be at least 4 characters"));
    }
}
