package com.nova_beauty.backend.validator;

import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.ConstraintValidator;

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

        // check exists
        if (promotionRepository.findByCode(code).isPresent()) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("MÃ£ khuyáº¿n mÃ£i Ä‘Ã£ tá»“n táº¡i")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}

