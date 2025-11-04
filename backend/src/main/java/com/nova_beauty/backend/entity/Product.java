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
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
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
    String author;

    @Column(name = "publisher")
    String publisher;

    @Column(name = "brand")
    String brand;

    @Column(name = "brand_origin")
    String brandOrigin;

    @Column(name = "manufacturing_location")
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

    @Column(name = "price", nullable = false)
    Double price;

    @Column(name = "tax")
    Double tax;

    @Column(name = "discount_value")
    Double discountValue;

    @Column(name = "quantity_sold")
    Integer quantitySold;

    @Column(name = "status", nullable = false)
    Boolean status;

    @Column(name = "publication_date")
    LocalDate publicationDate;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    // Submitted by user
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by")
    User submittedBy;

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
}
