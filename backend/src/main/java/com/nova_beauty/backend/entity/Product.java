package com.nova_beauty.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.*;

import com.nova_beauty.backend.enums.ProductStatus;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "products")
public class Product {
    @Id
    String id;

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "detailed_description", columnDefinition = "TEXT")
    String detailedDescription;

    @Column(name = "size")
    String size;

    @Column(name = "author")
    String texture; // Kết cấu

    @Column(name = "publisher")
    String skinType; // Loại da

    @Column(name = "brand")
    String brand;

    @Column(name = "brand_origin")
    String brandOrigin;

    @Column(name = "manufacturing_location", columnDefinition = "TEXT")
    String manufacturingLocation;

    @Column(name = "characteristics", columnDefinition = "TEXT")
    String characteristics;

    @Column(name = "ingredients", columnDefinition = "TEXT")
    String ingredients;

    @Column(name = "uses", columnDefinition = "TEXT")
    String uses;

    @Column(name = "usage_instructions", columnDefinition = "TEXT")
    String usageInstructions;

    @Column(name = "weight")
    Double weight;

    @Column(name = "length")
    Double length;

    @Column(name = "width")
    Double width;

    @Column(name = "height")
    Double height;

    @Column(name = "publication_date")
    LocalDate publicationDate;

    @Column(name = "unit_price")
    Double unitPrice;

    @Column(name = "price", nullable = false)
    Double price;

    @Column(name = "tax")
    Double tax;

    @Column(name = "discount_value")
    Double discountValue;

    @Column(name = "quantity_sold")
    Integer quantitySold;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    ProductStatus status;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    // Submitted by user
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by")
    User submittedBy;

    // Approval info
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    User approvedBy;

    @Column(name = "approved_at")
    LocalDateTime approvedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    String rejectionReason;

    // Category relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    Category category;

    // Product media
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    List<ProductMedia> mediaList;

    // Default media
    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "default_media_id")
    ProductMedia defaultMedia;

    // Reviews
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    List<Review> reviews;

    // Inventory
    @OneToOne(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    Inventory inventory;

    // Banners
    @ManyToMany(mappedBy = "products")
    List<Banner> banners;

    // Promotion
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promotion")
    Promotion promotionApply;

    // Bridge getters/setters to keep compatibility with NovaBeauty code using 'promotion'
    public Promotion getPromotion() {
        return promotionApply;
    }

    public void setPromotion(Promotion promotion) {
        this.promotionApply = promotion;
    }
}
