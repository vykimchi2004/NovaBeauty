package com.nova_beauty.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
@Table(name = "banners")
public class Banner {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "title", nullable = false)
    String title;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "image_url", nullable = false)
    String imageUrl;

    @Column(name = "link_url")
    String linkUrl;

    @Column(name = "status", nullable = false)
    Boolean status;

    @Column(name = "pending_review")
    Boolean pendingReview;

    @Column(name = "order_index")
    Integer orderIndex;

    @Column(name = "start_date")
    LocalDate startDate;

    @Column(name = "end_date")
    LocalDate endDate;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    @Column(name = "update_at", nullable = false)
    LocalDateTime updatedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    String rejectionReason;

    // Created by user
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    User createdBy;

    // Products relationship
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "banner_products",
            joinColumns = @JoinColumn(name = "banner_id"),
            inverseJoinColumns = @JoinColumn(name = "product_id"))
    List<Product> products;
}
