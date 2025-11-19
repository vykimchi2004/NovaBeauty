package com.nova_beauty.backend.validator;

import java.time.LocalDate;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import org.springframework.stereotype.Component;

import com.nova_beauty.backend.dto.request.PromotionCreationRequest;

@Component
public class PromotionDateValidator implements ConstraintValidator<PromotionDateConstraint, PromotionCreationRequest> {

    @Override
    public boolean isValid(PromotionCreationRequest request, ConstraintValidatorContext context) {
        if (request == null) {
            return true;
        }

        LocalDate startDate = request.getStartDate();
        LocalDate expiryDate = request.getExpiryDate();

        if (startDate != null && expiryDate != null && expiryDate.isBefore(startDate)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("NgÃ y káº¿t thÃºc pháº£i sau ngÃ y báº¯t Ä‘áº§u")
                    .addPropertyNode("expiryDate")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }
}
