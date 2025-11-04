package com.nova_beauty.backend.service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class PasswordGeneratorService {

    private static final String LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
    private static final String UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String DIGITS = "0123456789";
    private static final String SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    
    private final SecureRandom random = new SecureRandom();

    /**
     * Tạo mật khẩu thỏa mãn yêu cầu:
     * - Ít nhất 1 chữ cái thường
     * - Ít nhất 1 chữ cái in hoa
     * - Ít nhất 1 số
     * - Ít nhất 1 ký tự đặc biệt
     * - Tổng cộng 8 ký tự
     */
    public String generateSecurePassword() {
        log.info("Generating secure password for staff account");
        
        List<Character> password = new ArrayList<>();
        
        // Đảm bảo có ít nhất 1 ký tự từ mỗi loại
        password.add(getRandomChar(LOWERCASE));
        password.add(getRandomChar(UPPERCASE));
        password.add(getRandomChar(DIGITS));
        password.add(getRandomChar(SPECIAL_CHARS));
        
        // Thêm 4 ký tự ngẫu nhiên từ tất cả các loại
        String allChars = LOWERCASE + UPPERCASE + DIGITS + SPECIAL_CHARS;
        for (int i = 0; i < 4; i++) {
            password.add(getRandomChar(allChars));
        }
        
        // Trộn ngẫu nhiên các ký tự
        Collections.shuffle(password, random);
        
        // Chuyển đổi thành String
        StringBuilder result = new StringBuilder();
        for (char c : password) {
            result.append(c);
        }
        
        String generatedPassword = result.toString();
        log.info("Generated password successfully");
        
        return generatedPassword;
    }
    
    private char getRandomChar(String chars) {
        return chars.charAt(random.nextInt(chars.length()));
    }
    
    /**
     * Kiểm tra xem mật khẩu có thỏa mãn yêu cầu không
     */
    public boolean isValidPassword(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        
        boolean hasLowercase = password.chars().anyMatch(Character::isLowerCase);
        boolean hasUppercase = password.chars().anyMatch(Character::isUpperCase);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        boolean hasSpecialChar = password.chars().anyMatch(c -> 
            SPECIAL_CHARS.indexOf(c) != -1);
        
        return hasLowercase && hasUppercase && hasDigit && hasSpecialChar;
    }
}
