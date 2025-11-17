package com.nova_beauty.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL) // Nhá»¯ng field nÃ o null sáº½ k kÃ¨m vÃ o trong json
public class ApiResponse<T> {
    @Builder.Default
    int code = 1000;

    String message;
    T result;
}
