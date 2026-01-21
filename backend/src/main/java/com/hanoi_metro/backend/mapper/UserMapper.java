package com.hanoi_metro.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import com.hanoi_metro.backend.dto.request.UserCreationRequest;
import com.hanoi_metro.backend.dto.request.UserUpdateRequest;
import com.hanoi_metro.backend.dto.response.UserResponse;
import com.hanoi_metro.backend.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {

    // Request to Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "phoneNumber", ignore = true)
    @Mapping(target = "fullName", ignore = true)
    @Mapping(target = "address", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "reviews", ignore = true)
    @Mapping(target = "notifications", ignore = true)
    @Mapping(target = "addresses", ignore = true)
    User toUser(UserCreationRequest request);

    // Entity to Response
    @Mapping(target = "role", source = "role")
    @Mapping(target = "active", expression = "java(user.isActive())") // Map from User.isActive() to UserResponse.active
    UserResponse toUserResponse(User user);

    // Update Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "phoneNumber", ignore = true)
    @Mapping(target = "fullName", ignore = true)
    @Mapping(target = "address", ignore = true)
    @Mapping(target = "createAt", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "reviews", ignore = true)
    @Mapping(target = "notifications", ignore = true)
    @Mapping(target = "addresses", ignore = true)
    void updateUser(@MappingTarget User user, UserUpdateRequest request);
}
