package com.nova_beauty.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "reviews")
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "name_display")
    String nameDisplay;

    @Column(name = "rating", nullable = false)
    Integer rating; // 1-5 stars

    @Column(name = "comment", columnDefinition = "TEXT")
    String comment;

    @Column(name = "reply", columnDefinition = "TEXT")
    String reply;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    @Column(name = "reply_at")
    LocalDateTime replyAt;

    // User relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    // Product relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    Product product;
}
