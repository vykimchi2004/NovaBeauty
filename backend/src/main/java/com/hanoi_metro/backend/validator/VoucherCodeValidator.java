package com.hanoi_metro.backend.validator;

import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.ConstraintValidator;

import org.springframework.stereotype.Component;

import com.hanoi_metro.backend.repository.VoucherRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class VoucherCodeValidator implements ConstraintValidator<VoucherCodeConstraint, String> {

    private final VoucherRepository voucherRepository;

    @Override
    public boolean isValid(String code, ConstraintValidatorContext context) {
        if (code == null || code.trim().isEmpty()) {
            return true;
        }

        // check exists
        if (voucherRepository.findByCode(code).isPresent()) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Mã voucher đã tồn tại")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
