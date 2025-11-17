package com.nova_beauty.backend.validator;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

// Má»—i annotation chá»‰ nÃªn xá»­ lÃ½ cho 1 constraint nháº¥t Ä‘á»‹nh,
// 2 param: annotation mÃ  validator sáº½ chá»‹u trÃ¡ch nhiá»‡m, Kiá»ƒu dá»¯ liá»‡u data sáº½ validate
public class DobValidator implements ConstraintValidator<DobConstraint, LocalDate> {

    private int min;

    // HÃ m xá»­ lÃ½ data cÃ³ Ä‘Ãºng hay khÃ´ng
    @Override
    public boolean isValid(LocalDate value, ConstraintValidatorContext context) {
        if (Objects.isNull(value)) return true;

        long years = ChronoUnit.YEARS.between(
                value, LocalDate.now()); // Cho biáº¿t thá»i Ä‘iá»ƒm nháº­p vÃ o vÃ  thá»i Ä‘iá»ƒm hiá»‡n táº¡i Ä‘Ã£ tráº£i qua bao nhiÃªu nÄƒm

        return years >= min;
    }

    // HÃ m khá»Ÿi táº¡o, cháº¡y trÆ°á»›c isValid, get nhá»¯ng thÃ´ng sá»‘ cá»§a annotation
    @Override
    public void initialize(DobConstraint constraintAnnotation) {
        ConstraintValidator.super.initialize(constraintAnnotation);
        min = constraintAnnotation.min();
    }
}
