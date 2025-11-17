package com.nova_beauty.backend.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.nova_beauty.backend.dto.request.StaffCreationRequest;
import com.nova_beauty.backend.dto.request.UserCreationRequest;
import com.nova_beauty.backend.dto.request.UserUpdateRequest;
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
// Táº¡o 1 constructor cho táº¥t cáº£ cÃ¡c biáº¿n define lÃ  final -> Tá»± Ä‘á»™ng Ä‘Æ°a vÃ o
// constructor vÃ  inject dependency
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

        Role role = roleRepository
                .findById(request.getRoleName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        user.setActive(role.getName().equals("CUSTOMER"));
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

        // Kiá»ƒm tra email Ä‘Ã£ tá»“n táº¡i chÆ°a
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        // Táº¡o máº­t kháº©u tá»± Ä‘á»™ng
        String generatedPassword = passwordGeneratorService.generateSecurePassword();
        log.info("Password for staff: {}", generatedPassword);
        log.info("Generated password for staff: {}", request.getEmail());

        // Táº¡o user entity
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

        // Láº¥y role
        Role role = roleRepository
                .findById(request.getRoleName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        user.setRole(role);

        try {
            user = userRepository.save(user);
            log.info("Staff account created successfully with ID: {}", user.getId());

            // Gá»­i email chá»©a máº­t kháº©u
            try {
                brevoEmailService.sendStaffPasswordEmail(
                        request.getEmail(), request.getFullName(), generatedPassword, role.getName());
                log.info("Password email sent successfully to: {}", request.getEmail());
            } catch (Exception e) {
                log.error("Failed to send password email to: {} - Error: {}", request.getEmail(), e.getMessage());
                // KhÃ´ng throw exception vÃ¬ tÃ i khoáº£n Ä‘Ã£ Ä‘Æ°á»£c táº¡o thÃ nh cÃ´ng
            }

        } catch (DataIntegrityViolationException exception) {
            log.error("Data integrity violation when creating staff: {}", exception.getMessage());
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        return userMapper.toUserResponse(user);
    }

    public UserResponse getMyInfo() {
        // SecurityContextHolder chá»©a thÃ´ng tin vá» user Ä‘ang Ä‘Äƒng nháº­p
        // Khi request Ä‘Æ°á»£c xÃ¡c Ä‘á»‹nh thÃ nh cÃ´ng -> thÃ´ng tin lÆ°u trá»¯ cá»§a user Ä‘Æ°á»£c lÆ°u trong Security context holder
        var context = SecurityContextHolder.getContext();
        String name = context.getAuthentication().getName();

        User user = userRepository.findByEmail(name).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return userMapper.toUserResponse(user);
    }

    // User cÃ³ thá»ƒ update chÃ­nh mÃ¬nh, hoáº·c ADMIN cÃ³ thá»ƒ update báº¥t ká»³ user nÃ o
    public UserResponse updateUser(String userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Check current user is ADMIN
        var context = SecurityContextHolder.getContext();
        String currentEmail = context.getAuthentication().getName();
        
        // Check ADMIN tá»« SecurityContext authorities trÆ°á»›c
        var authorities = context.getAuthentication().getAuthorities();
        boolean isAdminFromAuthorities = authorities.stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
        
        // Load user vá»›i role (cÃ³ thá»ƒ cáº§n fetch role vÃ¬ lazy loading)
        User currentUser = userRepository
                .findByEmail(currentEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        
        boolean isAdminFromRole = currentUser.getRole() != null && 
                currentUser.getRole().getName().equals("ADMIN");
        
        boolean isAdmin = isAdminFromAuthorities || isAdminFromRole;
        
        // Náº¿u khÃ´ng pháº£i ADMIN vÃ  khÃ´ng pháº£i update chÃ­nh mÃ¬nh â†’ tá»« chá»‘i
        if (!isAdmin && !user.getEmail().equals(currentEmail)) {
            log.warn("Access denied: User {} attempted to update user {}", currentEmail, userId);
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        userMapper.updateUser(user, request);

        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            String roleName = currentUser.getRole().getName();
            if (roleName.equals("STAFF") || roleName.equals("CUSTOMER_SUPPORT")) {
                user.setActive(true);
            }
        }

        // Change Email
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            if (isAdmin) {
                user.setEmail(request.getEmail());
            }
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

        // isActive - chá»‰ cáº­p nháº­t náº¿u isActive cÃ³ trong request vÃ  user lÃ  ADMIN
        if (request.getIsActive() != null) {
            if (isAdmin) {
                boolean oldIsActiveValue = user.isActive();
                boolean newIsActiveValue = request.getIsActive();
                
                // Check if account is being locked (transition from active to inactive)
                if (oldIsActiveValue && !newIsActiveValue) {
                    // Account is being locked - send notification email
                    String userRoleName = user.getRole() != null ? user.getRole().getName() : null;
                    
                    // Only send email for CUSTOMER, STAFF, and CUSTOMER_SUPPORT (not ADMIN)
                    if (userRoleName != null && 
                        (userRoleName.equals("CUSTOMER") || 
                         userRoleName.equals("STAFF") || 
                         userRoleName.equals("CUSTOMER_SUPPORT"))) {
                        try {
                            brevoEmailService.sendAccountLockedEmail(
                                user.getEmail(),
                                user.getFullName(),
                                userRoleName
                            );
                            log.info("Account locked notification email sent to: {} (Role: {})", user.getEmail(), userRoleName);
                        } catch (Exception e) {
                            // Log error but don't fail the account lock operation
                            log.error("Failed to send account locked email to: {} - Error: {}", 
                                user.getEmail(), e.getMessage(), e);
                        }
                    }
                }
                
                user.setActive(newIsActiveValue);
            } else {
                // Náº¿u khÃ´ng pháº£i ADMIN mÃ  cá»‘ gáº¯ng thay Ä‘á»•i isActive â†’ tá»« chá»‘i
                log.warn("Non-admin user {} attempted to change isActive for user {}", currentEmail, userId);
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }

        // Save user vÃ o database
        User savedUser = userRepository.save(user);
        
        return userMapper.toUserResponse(savedUser);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(String userId) {
        userRepository.deleteById(userId);
    }

    // @EnableMethodSecurity trong SecurityConfig
    @PreAuthorize("hasRole('ADMIN')") // Spring táº¡o ra 1 proxy ngay trÆ°á»›c khi táº¡o hÃ m. Sá»­ dá»¥ng Ä‘Æ°á»£c nhá» khai bÃ¡o
    public List<UserResponse> getUsers() {
//        log.info("In method get Users");
        return userRepository.findAll().stream().map(userMapper::toUserResponse).toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse getUser(String id) {
        return userMapper.toUserResponse(
                userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED)));
    }
}
