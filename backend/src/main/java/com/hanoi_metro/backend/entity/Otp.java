package com.hanoi_metro.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Table(name = "otp")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
public class Otp {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(nullable = false)
    String email;

    @Column(nullable = false, length = 6)
    String code;

    @Column(nullable = false)
    LocalDateTime createdAt;

    @Column(nullable = false)
    LocalDateTime expiresAt;

    @Column(nullable = false)
    Boolean isUsed;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        isUsed = false;
    }
}
