package com.nova_beauty.backend.dto.request;

import jakarta.validation.constraints.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReviewReplyRequest {

    @NotBlank(message = "Phản hồi không được để trống")
    @Size(max = 1000, message = "Phản hồi không được vượt quá 1000 ký tự")
    String reply;
}
