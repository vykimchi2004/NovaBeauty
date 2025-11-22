package com.nova_beauty.backend.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.servlet.support.WebContentGenerator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nova_beauty.backend.dto.request.UserCreationRequest;
import com.nova_beauty.backend.dto.response.UserResponse;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.repository.UserRepository;

@SpringBootTest
@TestPropertySource("/test.properties") // Chỉ định ghi đè file cấu hình riêng cho môi trường test.
class UserServiceTest {
    @Autowired
    private UserService userService;

    // @MockitoBean
    @MockBean
    private UserRepository userRepository;

    private UserCreationRequest request;
    private UserResponse userResponse;
    private User user;
    private LocalDate dob;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private WebContentGenerator webContentGenerator;

    @BeforeEach
    void initData() { // chạy trước test

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
                .active(true)
                .createAt(LocalDate.now())
                .build();

        user = User.builder()
                .id("2b02565661d3")
                .email("john@example.com")
                .fullName("John Doe")
                .address("123 Main St")
                .isActive(true)
                .createAt(LocalDate.now())
                .build();
    }

    @Test
    void createUser_validRequest_success() {
        // GIVEN

        when(userRepository.save(any())).thenReturn(user);

        // WHEN
        var response = userService.createUser(request);

        // THEN
        Assertions.assertThat(response.getId()).isEqualTo("2b02565661d3");
//        Assertions.assertThat(response.getUsername()).isEqualTo("john");
    }

    @Test
    void createUser_userExisted_fail() {
        // GIVEN
//        when(userRepository.existsByUsername(anyString())).thenReturn(true);

        // WHEN
        var exception = assertThrows(
                AppException.class, () -> userService.createUser(request)); // 2 param: class exception, executed table

        // THEN
        Assertions.assertThat(exception.getErrorCode().getCode()).isEqualTo(1002);
    }

    /*
    - Đây là annotation có sẵn trong Spring Security Test (spring-security-test dependency).
    - Nó không phải là @WithMock + tên entity, mà là một annotation chuẩn của Spring để giả lập (mock) một người dùng đã đăng nhập trong môi trường test.
    @WithMockUser(username = "admin", roles = {"ADMIN", "USER"}, password = "12345")
    	username: tên giả lập user.
    	password: password (không thực sự dùng để login, chỉ mô phỏng).
    	roles: danh sách role (tự động thêm prefix "ROLE_").
    @WithMockUser: tạo user giả, không cần load từ DB.
    @WithUserDetails: sẽ gọi UserDetailsService để load user thật từ DB (dùng khi muốn test logic xác thực thật sự).
    */
    @Test
    @WithMockUser(username = "john")
    void getMyInfo_valid_success() {
//        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(user));

        var response = userService.getMyInfo();

//        Assertions.assertThat(response.getUsername()).isEqualTo("john");
        Assertions.assertThat(response.getId()).isEqualTo("2b02565661d3");
    }

    @Test
    @WithMockUser(username = "john")
    void getMyInfo_userNotFound_error() {
//        when(userRepository.findByUsername(anyString())).thenReturn(Optional.ofNullable(null));

        // WHEN
        var exception = assertThrows(AppException.class, () -> userService.getMyInfo());

        Assertions.assertThat(exception.getErrorCode().getCode()).isEqualTo(1005);
    }
}
