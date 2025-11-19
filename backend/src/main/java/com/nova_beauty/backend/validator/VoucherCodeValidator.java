package com.nova_beauty.backend.validator;

import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.ConstraintValidator;

import org.springframework.stereotype.Component;

import com.nova_beauty.backend.repository.VoucherRepository;

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
            context.buildConstraintViolationWithTemplate("MÃ£ voucher Ä‘Ã£ tá»“n táº¡i")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
