package com.nova_beauty.backend.validator;

import java.lang.annotation.*;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Documented
@Constraint(validatedBy = EmailValidator.class)
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
public @interface EmailConstraint {
    String message() default "Email khÃ´ng há»£p lá»‡";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
