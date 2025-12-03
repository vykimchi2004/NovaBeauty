package com.nova_beauty.backend.validator;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class EmailValidator implements ConstraintValidator<EmailConstraint, String> {

    @Override
    public void initialize(EmailConstraint constraintAnnotation) {
        // Không cần khởi tạo gì đặc biệt
    }

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        if (email == null || email.trim().isEmpty()) {
            return true; // Äá»ƒ @NotBlank xá»­ lÃ½ trÆ°á»ng há»£p null/empty
        }

        // Kiểm tra dấu chấm liên tiếp
        if (email.contains("..")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Email không được chứa dấu chấm liên tiếp")
                    .addConstraintViolation();
            return false;
        }

        // Kiểm tra có ký tự @ và chia thành 2 phần
        String[] parts = email.split("@");
        if (parts.length != 2) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Email phải có đúng một ký tự @")
                    .addConstraintViolation();
            return false;
        }

        String localPart = parts[0];
        String domainPart = parts[1];

        // Kiểm tra local part và domain part không rỗng
        if (localPart.isEmpty() || domainPart.isEmpty()) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Email phải có phần tên và domain")
                    .addConstraintViolation();
            return false;
        }

        // Kiểm tra dấu chấm ở đầu hoặc cuối local part
        if (localPart.startsWith(".") || localPart.endsWith(".")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Tên email không được bắt đầu hoặc kết thúc bằng dấu chấm")
                    .addConstraintViolation();
            return false;
        }

        // Kiểm tra dấu chấm ở đầu hoặc cuối domain part
        if (domainPart.startsWith(".") || domainPart.endsWith(".")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Domain không được bắt đầu hoặc kết thúc bằng dấu chấm")
                    .addConstraintViolation();
            return false;
        }

        // Kiểm tra format email với regex
        String emailRegex = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";
        if (!email.matches(emailRegex)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Email không đúng định dạng")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
