package com.nova_beauty.backend.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.nova_beauty.backend.dto.request.UserCreationRequest;
import com.nova_beauty.backend.dto.request.UserUpdateRequest;
import com.nova_beauty.backend.dto.request.StaffCreationRequest;
import com.nova_beauty.backend.dto.response.UserResponse;
import com.nova_beauty.backend.entity.Role;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.UserMapper;
import com.nova_beauty.backend.repository.RoleRepository;
import com.nova_beauty.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
// Tạo 1 constructor cho tất cả các biến define là final -> Tự động đưa vào
// constructor và inject dependency
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserService {
    UserRepository userRepository;
    RoleRepository roleRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;
    PasswordGeneratorService passwordGeneratorService;
    BrevoEmailService brevoEmailService;

    @NonFinal
    @Value("${app.default-avatar}")
    private String defaultAvatarUrl;

    public UserResponse createUser(UserCreationRequest request) {
        User user = userMapper.toUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber() : "");
        user.setFullName(request.getFullName());
        user.setAddress(request.getAddress() != null ? request.getAddress() : "");
        user.setAvatarUrl(defaultAvatarUrl);
        user.setCreateAt(LocalDate.now());
        user.setActive(true);

        Role role = roleRepository
                .findById(request.getRoleName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        user.setRole(role);

        try {
            user = userRepository.save(user);
        } catch (DataIntegrityViolationException exception) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        return userMapper.toUserResponse(user);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse createStaff(StaffCreationRequest request) {
        log.info("Creating staff account for email: {}", request.getEmail());
        
        // Kiểm tra email đã tồn tại chưa
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        
        // Tạo mật khẩu tự động
        String generatedPassword = passwordGeneratorService.generateSecurePassword();
        log.info("Generated password for staff: {}", request.getEmail());
        
        // Tạo user entity
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(generatedPassword))
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber() : "")
                .address(request.getAddress() != null ? request.getAddress() : "")
                .avatarUrl(defaultAvatarUrl)
                .createAt(LocalDate.now())
                .isActive(request.isActive())
                .build();
        
        // Lấy role
        Role role = roleRepository
                .findById(request.getRoleName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        user.setRole(role);
        
        try {
            user = userRepository.save(user);
            log.info("Staff account created successfully with ID: {}", user.getId());
            
            // Gửi email chứa mật khẩu
            try {
                brevoEmailService.sendStaffPasswordEmail(
                    request.getEmail(), 
                    request.getFullName(), 
                    generatedPassword, 
                    role.getName()
                );
                log.info("Password email sent successfully to: {}", request.getEmail());
            } catch (Exception e) {
                log.error("Failed to send password email to: {} - Error: {}", request.getEmail(), e.getMessage());
                // Không throw exception vì tài khoản đã được tạo thành công
            }
            
        } catch (DataIntegrityViolationException exception) {
            log.error("Data integrity violation when creating staff: {}", exception.getMessage());
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        
        return userMapper.toUserResponse(user);
    }

    public UserResponse getMyInfo() {
        // SecurityContextHolder chứa thông tin về user đang đăng nhập
        // Khi request được xác định thành công -> thông tin lưu trữ của user được lưu trong Security context holder
        var context = SecurityContextHolder.getContext();
        String name = context.getAuthentication().getName();

        User user = userRepository.findByEmail(name).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return userMapper.toUserResponse(user);
    }

    // User chỉ có thể lấy được thông tin của chính mình, không thể lấy được thông tin của người khác
    @PostAuthorize("returnObject.email == authentication.name")
    public UserResponse updateUser(String userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        userMapper.updateUser(user, request);

        // Check current user is ADMIN
        var context = SecurityContextHolder.getContext();
        String currentEmail = context.getAuthentication().getName();
        User currentUser = userRepository
                .findByEmail(currentEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        boolean isAdmin =
                currentUser.getRole() != null && currentUser.getRole().getName().equals("ADMIN");

        // Password TODO: Nhập mật khẩu cũ
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        // Email TODO: Thêm OTP khi thay pass
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            user.setEmail(request.getEmail());
        }

        // PhoneNumber
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isEmpty()) {
            user.setPhoneNumber(request.getPhoneNumber());
        }

        // FullName
        if (request.getFullName() != null && !request.getFullName().isEmpty()) {
            user.setFullName(request.getFullName());
        }
        // Address
        if (request.getAddress() != null && !request.getAddress().isEmpty()) {
            user.setAddress(request.getAddress());
        }
        // AvatarUrl
        if (request.getAvatarUrl() != null && !request.getAvatarUrl().isEmpty()) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        // role
        if (request.getRole() != null && !request.getRole().isEmpty()) {
            if (isAdmin) {
                Role newRole = roleRepository
                        .findById(request.getRole())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
                user.setRole(newRole);
            } else {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }

        // isActive
        if (isAdmin) {
            user.setActive(request.getIsActive());
        } else {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(String userId) {
        userRepository.deleteById(userId);
    }

    // @EnableMethodSecurity trong SecurityConfig
    @PreAuthorize("hasRole('ADMIN')") // Spring tạo ra 1 proxy ngay trước khi tạo hàm. Sử dụng được nhờ khai báo
    public List<UserResponse> getUsers() {
        log.info("In method get Users");
        return userRepository.findAll().stream().map(userMapper::toUserResponse).toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse getUser(String id) {
        return userMapper.toUserResponse(
                userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED)));
    }
}
