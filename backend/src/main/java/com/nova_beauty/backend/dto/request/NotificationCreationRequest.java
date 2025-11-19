package com.nova_beauty.backend.dto.request;

import java.util.Set;

import jakarta.validation.constraints.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationCreationRequest {

    @NotBlank(message = "TiÃªu Ä‘á» khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Size(max = 255, message = "TiÃªu Ä‘á» khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 255 kÃ½ tá»±")
    String title;

    @NotBlank(message = "Ná»™i dung khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    @Size(max = 1000, message = "Ná»™i dung khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 1000 kÃ½ tá»±")
    String message;

    @NotBlank(message = "Loáº¡i thÃ´ng bÃ¡o khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng")
    String type;

    Set<String> userIds;
}
