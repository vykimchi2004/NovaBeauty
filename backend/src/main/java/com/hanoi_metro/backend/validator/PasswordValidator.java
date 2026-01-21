package com.hanoi_metro.backend.validator;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordValidator implements ConstraintValidator<PasswordConstraint, String> {

    @Override
    public void initialize(PasswordConstraint constraintAnnotation) {
        // Không cần khởi tạo gì đặc biệt
    }

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if (password == null) {
            return true; // Để @NotNull xử lý trường hợp null
        }

        // Kiểm tra độ dài
        if (password.length() < 8) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Mật khẩu quá ngắn, tối thiểu 8 ký tự")
                    .addConstraintViolation();
            return false;
        }

        if (password.length() > 32) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Mật khẩu quá dài, tối đa 32 ký tự")
                    .addConstraintViolation();
            return false;
        }

        // Kiểm tra khoảng trắng (bao gồm tất cả loại khoảng trắng Unicode)
        String whitespaceRegex =
                "[\\s\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF\\u200B\\u200C\\u200D]";
        if (password.matches(".*" + whitespaceRegex + ".*")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Mật khẩu không được chứa khoảng trắng")
                    .addConstraintViolation();
            return false;
        }

        // Kiểm tra các yêu cầu về ký tự
        boolean hasLowercase = password.matches(".*[a-z].*");
        boolean hasUppercase = password.matches(".*[A-Z].*");
        boolean hasDigit = password.matches(".*\\d.*");
        boolean hasSpecial = password.matches(".*[^A-Za-z0-9].*");

        if (!(hasLowercase && hasUppercase && hasDigit && hasSpecial)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                            "Mật khẩu ít nhất phải chứa một chữ cái thường, một chữ cái in hoa, một số và một ký tự đặc biệt")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
