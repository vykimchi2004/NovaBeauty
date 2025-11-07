package com.nova_beauty.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.*;

import com.nova_beauty.backend.enums.VoucherStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
public class Voucher {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(unique = true, nullable = false)
    String code;

    String name;
    String discountType;

    Double minOrderValue;
    Double maxOrderValue;
    Double discountValue;
    Double maxDiscountValue;

    LocalDate startDate;
    LocalDate expiryDate;

    String imageUrl;
    String comment;
    Integer usageLimit;
    Integer usageCount;

    Boolean isActive;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    VoucherStatus status;

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

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "voucher_categories",
            joinColumns = @JoinColumn(name = "voucher_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    List<Category> categoryApply;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "voucher_products",
            joinColumns = @JoinColumn(name = "voucher_id"),
            inverseJoinColumns = @JoinColumn(name = "product_id"))
    List<Product> productApply;
}


