package com.hanoi_metro.backend.validator;

import static java.lang.annotation.ElementType.*;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import java.lang.annotation.*;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

// METHOD, FIELD, ANNOTATION_TYPE, CONSTRUCTOR, PARAMETER, TYPE_USE
@Target({FIELD}) // Annotation này sẽ được apply ở đâu
@Retention(RUNTIME) // Annotation sẽ được xử lý lúc nào
@Constraint(validatedBy = {DobValidator.class}) // Class chịu trách nhiệm cho annotation này
public @interface DobConstraint {
    /// Không có giá trị default trả về -> bắt buộc phải khai báo
    int min();

    /// 3 property cơ bản của annotation dành cho validation
    String message() default "Invalid date of birth";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
