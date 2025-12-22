package com.nova_beauty.backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PasswordService {

    UserRepository userRepository;
    PasswordEncoder passwordEncoder;
    OtpService otpService;

    /**
     * Helper method để tìm user theo email, xử lý trường hợp duplicate email
     * Nếu có duplicate, lấy user mới nhất (createAt DESC)
     */
    private java.util.Optional<User> findUserByEmailSafe(String email) {
        try {
            return userRepository.findByEmail(email);
        } catch (org.springframework.dao.IncorrectResultSizeDataAccessException e) {
            // Nếu có duplicate email, lấy user mới nhất
            return userRepository.findFirstByEmailOrderByCreateAtDesc(email);
        }
    }

    public void resetPasswordByOtp(String email, String otp, String newPassword) {
        otpService.consumeOtp(email, otp);
        User user = findUserByEmailSafe(email).orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void changePasswordByEmail(String email, String currentPassword, String newPassword) {
        User user = findUserByEmailSafe(email).orElseThrow(() -> new RuntimeException("User not found"));
        changePassword(user, currentPassword, newPassword);
    }

    public void changePassword(User user, String currentPassword, String newPassword) {
        // Kiểm tra user có phải Google user chưa có mật khẩu không
        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            throw new RuntimeException("Bạn chưa có mật khẩu. Vui lòng đăng ký và thiết lập mật khẩu trước khi có thể đổi mật khẩu.");
        }
        
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không đúng");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    /**
     * Set password for Google user
     * 
     * QUAN TRỌNG: CHỈ CẬP NHẬT MẬT KHẨU, KHÔNG TẠO TÀI KHOẢN MỚI
     * 
     * User đã tồn tại trong database (đã đăng nhập bằng Google trước đó)
     * Chỉ cần cập nhật password cho user hiện có
     * 
     * LƯU Ý QUAN TRỌNG:
     * - KHÔNG TẠO USER MỚI: userRepository.save() sẽ UPDATE user hiện có (có id), không INSERT
     * - fullName sẽ được GIỮ NGUYÊN theo tên ban đầu từ Google login (KHÔNG THAY ĐỔI)
     * - Chỉ cập nhật password, không động vào các field khác (email, fullName, role, etc.)
     * - Nếu user không tồn tại → throw RuntimeException("User not found")
     * 
     * @param email Email của user (PHẢI ĐÃ TỒN TẠI trong database)
     * @param otp OTP đã verify
     * @param newPassword Mật khẩu mới
     * @throws RuntimeException nếu user không tồn tại hoặc đã có mật khẩu
     */
    public void setPasswordForGoogleUser(String email, String otp, String newPassword) {
        otpService.consumeOtp(email, otp);
        
        // Tìm user HIỆN CÓ trong database (KHÔNG TẠO MỚI)
        // Xử lý trường hợp duplicate email: lấy user mới nhất
        // Nếu không tìm thấy → throw exception (KHÔNG tự động tạo user mới)
        User user = findUserByEmailSafe(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // ĐẢM BẢO user đã có id (đã tồn tại trong database)
        // Nếu không có id → throw exception (KHÔNG được tạo mới)
        if (user.getId() == null || user.getId().isEmpty()) {
            throw new RuntimeException("User không hợp lệ: không có ID. Không thể cập nhật mật khẩu.");
        }
        
        // Lưu fullName ban đầu để đảm bảo không thay đổi
        String originalFullName = user.getFullName();
        
        // Kiểm tra user có phải Google user không (password rỗng)
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            throw new RuntimeException("Tài khoản này đã có mật khẩu. Vui lòng sử dụng chức năng đổi mật khẩu.");
        }
        
        // CHỈ CẬP NHẬT password, KHÔNG ĐỘNG VÀO fullName hoặc các field khác
        // fullName sẽ giữ nguyên theo tên ban đầu từ Google login
        user.setPassword(passwordEncoder.encode(newPassword));
        
        // ĐẢM BẢO fullName không bị thay đổi (phòng trường hợp có logic nào đó thay đổi)
        user.setFullName(originalFullName);
        
        // userRepository.save() sẽ UPDATE user hiện có vì user đã có id (không phải null)
        // JPA sẽ tự động phát hiện đây là UPDATE (user có id) chứ không phải INSERT (user không có id)
        User savedUser = userRepository.save(user); // UPDATE existing user, KHÔNG INSERT user mới
        
        // Verify: savedUser phải có cùng id với user ban đầu (không tạo mới)
        if (!savedUser.getId().equals(user.getId())) {
            throw new RuntimeException("Lỗi: Đã tạo user mới thay vì cập nhật user hiện có!");
        }
    }

    // Check if email is Google login (password is empty)
    public boolean isGoogleUser(String email) {
        User user = findUserByEmailSafe(email).orElse(null);
        if (user == null) {
            return false;
        }
        return user.getPassword() == null || user.getPassword().isEmpty();
    }
}