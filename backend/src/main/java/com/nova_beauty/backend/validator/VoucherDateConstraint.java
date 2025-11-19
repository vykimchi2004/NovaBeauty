package com.nova_beauty.backend.validator;

import java.lang.annotation.*;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Documented
@Constraint(validatedBy = VoucherDateValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface VoucherDateConstraint {
    String message() default "NgÃ y khuyáº¿n mÃ£i khÃ´ng há»£p lá»‡";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
