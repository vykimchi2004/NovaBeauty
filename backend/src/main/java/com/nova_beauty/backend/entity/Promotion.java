package com.nova_beauty.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.*;

import com.nova_beauty.backend.enums.DiscountApplyScope;
import com.nova_beauty.backend.enums.DiscountValueType;
import com.nova_beauty.backend.enums.PromotionStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "promotions")
public class Promotion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "code", unique = true, nullable = false)
    String code;

    String imageUrl;
    String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_value_type", nullable = false)
    DiscountValueType discountValueType;

    @Column(name = "discount_value", nullable = false)
    Double discountValue;

    @Column(name = "min_order_value")
    Double minOrderValue;

    @Column(name = "max_discount_value")
    Double maxDiscountValue;

    @Column(name = "start_date", nullable = false)
    LocalDate startDate;

    @Column(name = "expiry_date", nullable = false)
    LocalDate expiryDate;

    @Column(name = "usage_count")
    @Builder.Default
    Integer usageCount = 0;

    @Column(name = "usage_limit")
    Integer usageLimit;

    @Column(name = "is_active")
    Boolean isActive;

    @Enumerated(EnumType.STRING)
    @Column(name = "apply_scope", nullable = false)
    DiscountApplyScope applyScope;

    // Approval workflow fields
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    PromotionStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by")
    User submittedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    User approvedBy;

    @Column(name = "submitted_at")
    LocalDateTime submittedAt;

    @Column(name = "approved_at")
    LocalDateTime approvedAt;

    @Column(name = "rejection_reason")
    String rejectionReason;

    // Promotion application scope
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "promotion_categories",
            joinColumns = @JoinColumn(name = "promotion_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    @Builder.Default
    Set<Category> categoryApply = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "promotion_products",
            joinColumns = @JoinColumn(name = "promotion_id"),
            inverseJoinColumns = @JoinColumn(name = "product_id"))
    @Builder.Default
    Set<Product> productApply = new HashSet<>();
}
