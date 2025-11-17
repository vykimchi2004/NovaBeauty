package com.nova_beauty.backend.validator;

import static java.lang.annotation.ElementType.*;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import java.lang.annotation.*;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

// METHOD, FIELD, ANNOTATION_TYPE, CONSTRUCTOR, PARAMETER, TYPE_USE
@Target({FIELD}) // Annotation nÃ y sáº½ Ä‘Æ°á»£c apply á»Ÿ Ä‘Ã¢u
@Retention(RUNTIME) // Annotation sáº½ Ä‘Æ°á»£c xá»­ lÃ½ lÃºc nÃ o
@Constraint(validatedBy = {DobValidator.class}) // Class chá»‹u trÃ¡ch nhiá»‡m cho annotation nÃ y
public @interface DobConstraint {
    /// KhÃ´ng cÃ³ giÃ¡ trá»‹ default tráº£ vá» -> báº¯t buá»™c pháº£i khai bÃ¡o
    int min();

    /// 3 property cÆ¡ báº£n cá»§a annotation dÃ nh cho validation
    String message() default "Invalid date of birth";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
