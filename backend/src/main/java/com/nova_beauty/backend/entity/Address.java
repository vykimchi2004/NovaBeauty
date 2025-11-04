package com.nova_beauty.backend.entity;

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
    String recipientPhone;
    String street;
    String city;
    String country;
    boolean isDefault;

    @ManyToMany(mappedBy = "addresses")
    Set<User> users;
}
