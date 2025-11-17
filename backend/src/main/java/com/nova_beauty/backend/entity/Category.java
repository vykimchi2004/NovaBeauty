package com.nova_beauty.backend.entity;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
@Table(name = "categories")
public class Category {
    @Id
    @Column(name = "id", nullable = false, unique = true)
    String id;

    @Column(name = "name", nullable = false, unique = true)
    String name;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "status", nullable = false)
    Boolean status;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    // Categories
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    Category parentCategory;

    @OneToMany(mappedBy = "parentCategory", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    List<Category> subCategories;

    // Products
    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    List<Product> products;

    // Promotions/Vouchers scope
    @ManyToMany(mappedBy = "categoryApply", fetch = FetchType.LAZY)
    @Builder.Default
    Set<Promotion> promotions = new HashSet<>();

    @ManyToMany(mappedBy = "categoryApply", fetch = FetchType.LAZY)
    @Builder.Default
    Set<Voucher> vouchers = new HashSet<>();
}
