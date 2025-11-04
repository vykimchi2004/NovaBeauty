package com.nova_beauty.backend.validator;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import org.springframework.stereotype.Component;

import com.nova_beauty.backend.repository.PromotionRepository;

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

        // Check exists
        if (promotionRepository.findByCode(code).isPresent()) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Mã khuyến mãi đã tồn tại")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
