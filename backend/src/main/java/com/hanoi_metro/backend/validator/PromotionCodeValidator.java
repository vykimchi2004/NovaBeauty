package com.hanoi_metro.backend.validator;

import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.ConstraintValidator;

import org.springframework.stereotype.Component;

import com.hanoi_metro.backend.repository.PromotionRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class PromotionCodeValidator implements ConstraintValidator<PromotionCodeConstraint, String> {

    private final PromotionRepository promotionRepository;

    @Override
    public boolean isValid(String code, ConstraintValidatorContext context) {
        if (code == null || code.trim().isEmpty()) {
            return true;
        }

        // check exists
        if (promotionRepository.findByCode(code).isPresent()) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Mã khuyến mãi đã tồn tại")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}

