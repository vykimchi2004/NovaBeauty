package com.hanoi_metro.backend.service;

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
     * Táº¡o máº­t kháº©u thá»a mÃ£n yÃªu cáº§u:
     * - Ãt nháº¥t 1 chá»¯ cÃ¡i thÆ°á»ng
     * - Ãt nháº¥t 1 chá»¯ cÃ¡i in hoa
     * - Ãt nháº¥t 1 sá»‘
     * - Ãt nháº¥t 1 kÃ½ tá»± Ä‘áº·c biá»‡t
     * - Tá»•ng cá»™ng 8 kÃ½ tá»±
     */
    public String generateSecurePassword() {
        log.info("Generating secure password for staff account");

        List<Character> password = new ArrayList<>();

        // Äáº£m báº£o cÃ³ Ã­t nháº¥t 1 kÃ½ tá»± tá»« má»—i loáº¡i
        password.add(getRandomChar(LOWERCASE));
        password.add(getRandomChar(UPPERCASE));
        password.add(getRandomChar(DIGITS));
        password.add(getRandomChar(SPECIAL_CHARS));

        // ThÃªm 4 kÃ½ tá»± ngáº«u nhiÃªn tá»« táº¥t cáº£ cÃ¡c loáº¡i
        String allChars = LOWERCASE + UPPERCASE + DIGITS + SPECIAL_CHARS;
        for (int i = 0; i < 4; i++) {
            password.add(getRandomChar(allChars));
        }

        // Trá»™n ngáº«u nhiÃªn cÃ¡c kÃ½ tá»±
        Collections.shuffle(password, random);

        // Chuyá»ƒn Ä‘á»•i thÃ nh String
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
     * Kiá»ƒm tra xem máº­t kháº©u cÃ³ thá»a mÃ£n yÃªu cáº§u khÃ´ng
     */
    public boolean isValidPassword(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }

        boolean hasLowercase = password.chars().anyMatch(Character::isLowerCase);
        boolean hasUppercase = password.chars().anyMatch(Character::isUpperCase);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        boolean hasSpecialChar = password.chars().anyMatch(c -> SPECIAL_CHARS.indexOf(c) != -1);

        return hasLowercase && hasUppercase && hasDigit && hasSpecialChar;
    }
}
