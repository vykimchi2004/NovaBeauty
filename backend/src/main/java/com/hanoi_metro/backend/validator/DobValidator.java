package com.hanoi_metro.backend.validator;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

// Mỗi annotation chỉ nên xử lý cho 1 constraint nhất định,
// 2 param: annotation mà validator sẽ chịu trách nhiệm, Kiểu dữ liệu data sẽ validate
public class DobValidator implements ConstraintValidator<DobConstraint, LocalDate> {

    private int min;

    // Hàm xử lý data có đúng hay không
    @Override
    public boolean isValid(LocalDate value, ConstraintValidatorContext context) {
        if (Objects.isNull(value)) return true;

        long years = ChronoUnit.YEARS.between(
                value, LocalDate.now()); // Cho biết thời điểm nhập vào và thời điểm hiện tại đã trải qua bao nhiêu năm

        return years >= min;
    }

    // Hàm khởi tạo, chạy trước isValid, get những thông số của annotation
    @Override
    public void initialize(DobConstraint constraintAnnotation) {
        ConstraintValidator.super.initialize(constraintAnnotation);
        min = constraintAnnotation.min();
    }
}
