package com.nova_beauty.backend.validator;

import java.util.Set;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import org.springframework.stereotype.Component;

import com.nova_beauty.backend.dto.request.PromotionCreationRequest;
import com.nova_beauty.backend.enums.DiscountApplyScope;

@Component
public class PromotionScopeValidator implements ConstraintValidator<PromotionScopeConstraint, PromotionCreationRequest> {

    @Override
    public boolean isValid(PromotionCreationRequest request, ConstraintValidatorContext context) {
        if (request == null) {
            return true;
        }

        DiscountApplyScope scope = request.getApplyScope();
        Set<String> categoryIds = request.getCategoryIds();
        Set<String> productIds = request.getProductIds();

        if (scope == null) {
            return true;
        }

        context.disableDefaultConstraintViolation();

        switch (scope) {
            case ORDER:
                boolean orderValid = (categoryIds == null || categoryIds.isEmpty())
                        && (productIds == null || productIds.isEmpty());
                if (!orderValid) {
                    context.buildConstraintViolationWithTemplate(
                                    "Khuyáº¿n mÃ£i Ã¡p dá»¥ng toÃ n bá»™ Ä‘Æ¡n hÃ ng khÃ´ng Ä‘Æ°á»£c chá»n danh má»¥c hoáº·c sáº£n pháº©m cá»¥ thá»ƒ")
                            .addConstraintViolation();
                }
                return orderValid;
            case CATEGORY:
                boolean categoryValid = categoryIds != null && !categoryIds.isEmpty();
                if (!categoryValid) {
                    context.buildConstraintViolationWithTemplate(
                                    "Vui lÃ²ng chá»n Ã­t nháº¥t má»™t danh má»¥c khi Ã¡p dá»¥ng theo danh má»¥c")
                            .addConstraintViolation();
                    return false;
                }
                if (productIds != null && !productIds.isEmpty()) {
                    context.buildConstraintViolationWithTemplate(
                                    "KhÃ´ng Ä‘Æ°á»£c chá»n sáº£n pháº©m cá»¥ thá»ƒ khi khuyáº¿n mÃ£i Ã¡p dá»¥ng theo danh má»¥c")
                            .addConstraintViolation();
                    return false;
                }
                return true;
            case PRODUCT:
                boolean productValid = productIds != null && !productIds.isEmpty();
                if (!productValid) {
                    context.buildConstraintViolationWithTemplate(
                                    "Vui lÃ²ng chá»n Ã­t nháº¥t má»™t sáº£n pháº©m khi Ã¡p dá»¥ng theo sáº£n pháº©m")
                            .addConstraintViolation();
                    return false;
                }
                if (categoryIds != null && !categoryIds.isEmpty()) {
                    context.buildConstraintViolationWithTemplate(
                                    "KhÃ´ng Ä‘Æ°á»£c chá»n danh má»¥c khi khuyáº¿n mÃ£i Ã¡p dá»¥ng theo sáº£n pháº©m cá»¥ thá»ƒ")
                            .addConstraintViolation();
                    return false;
                }
                return true;
            default:
                return true;
        }
    }
}


