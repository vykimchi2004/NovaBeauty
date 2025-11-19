package com.nova_beauty.backend.validator;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class EmailValidator implements ConstraintValidator<EmailConstraint, String> {

    @Override
    public void initialize(EmailConstraint constraintAnnotation) {
        // KhÃ´ng cáº§n khá»Ÿi táº¡o gÃ¬ Ä‘áº·c biá»‡t
    }

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        if (email == null || email.trim().isEmpty()) {
            return true; // Äá»ƒ @NotBlank xá»­ lÃ½ trÆ°á»ng há»£p null/empty
        }

        // Kiá»ƒm tra dáº¥u cháº¥m liÃªn tiáº¿p
        if (email.contains("..")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Email khÃ´ng Ä‘Æ°á»£c chá»©a dáº¥u cháº¥m liÃªn tiáº¿p")
                    .addConstraintViolation();
            return false;
        }

        // Kiá»ƒm tra cÃ³ kÃ½ tá»± @ vÃ  chia thÃ nh 2 pháº§n
        String[] parts = email.split("@");
        if (parts.length != 2) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Email pháº£i cÃ³ Ä‘Ãºng má»™t kÃ½ tá»± @")
                    .addConstraintViolation();
            return false;
        }

        String localPart = parts[0];
        String domainPart = parts[1];

        // Kiá»ƒm tra local part vÃ  domain part khÃ´ng rá»—ng
        if (localPart.isEmpty() || domainPart.isEmpty()) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Email pháº£i cÃ³ pháº§n tÃªn vÃ  domain")
                    .addConstraintViolation();
            return false;
        }

        // Kiá»ƒm tra dáº¥u cháº¥m á»Ÿ Ä‘áº§u hoáº·c cuá»‘i local part
        if (localPart.startsWith(".") || localPart.endsWith(".")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("TÃªn email khÃ´ng Ä‘Æ°á»£c báº¯t Ä‘áº§u hoáº·c káº¿t thÃºc báº±ng dáº¥u cháº¥m")
                    .addConstraintViolation();
            return false;
        }

        // Kiá»ƒm tra dáº¥u cháº¥m á»Ÿ Ä‘áº§u hoáº·c cuá»‘i domain part
        if (domainPart.startsWith(".") || domainPart.endsWith(".")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Domain khÃ´ng Ä‘Æ°á»£c báº¯t Ä‘áº§u hoáº·c káº¿t thÃºc báº±ng dáº¥u cháº¥m")
                    .addConstraintViolation();
            return false;
        }

        // Kiá»ƒm tra format email vá»›i regex
        String emailRegex = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";
        if (!email.matches(emailRegex)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Email khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
