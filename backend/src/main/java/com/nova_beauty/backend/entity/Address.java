package com.nova_beauty.backend.entity;

import java.time.LocalDateTime;
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
public class Address {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // Tạo chuỗi ID ngẫu nhiên
    String addressId;

    String recipientName;
    String recipientPhoneNumber;
    String country;
    String provinceID;
    String provinceName;
    String districtID;
    String districtName;
    String wardCode;
    String wardName;
    String address;

    String postalCode;
    @Column(name = "is_default")
    boolean defaultAddress;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    @ManyToMany(mappedBy = "addresses")
    Set<User> users;
}
