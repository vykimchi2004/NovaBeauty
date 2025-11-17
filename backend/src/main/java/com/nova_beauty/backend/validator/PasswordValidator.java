package com.nova_beauty.backend.validator;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordValidator implements ConstraintValidator<PasswordConstraint, String> {

    @Override
    public void initialize(PasswordConstraint constraintAnnotation) {
        // KhÃ´ng cáº§n khá»Ÿi táº¡o gÃ¬ Ä‘áº·c biá»‡t
    }

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return true; // Äá»ƒ @NotNull xá»­ lÃ½ trÆ°á»ng há»£p null
        }

        // Kiá»ƒm tra Ä‘á»™ dÃ i
        if (password.length() < 8) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Máº­t kháº©u quÃ¡ ngáº¯n, tá»‘i thiá»ƒu 8 kÃ½ tá»±")
                    .addConstraintViolation();
            return false;
        }

        if (password.length() > 32) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Máº­t kháº©u quÃ¡ dÃ i, tá»‘i Ä‘a 32 kÃ½ tá»±")
                    .addConstraintViolation();
            return false;
        }

        // Kiá»ƒm tra khoáº£ng tráº¯ng (bao gá»“m táº¥t cáº£ loáº¡i khoáº£ng tráº¯ng Unicode)
        String whitespaceRegex =
                "[\\s\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF\\u200B\\u200C\\u200D]";
        if (password.matches(".*" + whitespaceRegex + ".*")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Máº­t kháº©u khÃ´ng Ä‘Æ°á»£c chá»©a khoáº£ng tráº¯ng")
                    .addConstraintViolation();
            return false;
        }

        // Kiá»ƒm tra cÃ¡c yÃªu cáº§u vá» kÃ½ tá»±
        boolean hasLowercase = password.matches(".*[a-z].*");
        boolean hasUppercase = password.matches(".*[A-Z].*");
        boolean hasDigit = password.matches(".*\\d.*");
        boolean hasSpecial = password.matches(".*[^A-Za-z0-9].*");

        if (!(hasLowercase && hasUppercase && hasDigit && hasSpecial)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                            "Máº­t kháº©u Ã­t nháº¥t pháº£i chá»©a má»™t chá»¯ cÃ¡i thÆ°á»ng, 1 chá»¯ cÃ¡i in hoa, 1 sá»‘ vÃ  1 kÃ½ tá»± Ä‘áº·c biá»‡t")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
