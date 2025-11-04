package com.nova_beauty.backend.mapper;

import java.util.Set;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import com.nova_beauty.backend.dto.request.NotificationCreationRequest;
import com.nova_beauty.backend.dto.response.NotificationResponse;
import com.nova_beauty.backend.entity.Notification;
import com.nova_beauty.backend.entity.User;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    // Entity to Response
    @Mapping(target = "userIds", source = "users", qualifiedByName = "mapUserIds")
    @Mapping(target = "userNames", source = "users", qualifiedByName = "mapUserNames")
    NotificationResponse toResponse(Notification notification);

    // Request to Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "readAt", ignore = true)
    @Mapping(target = "isRead", ignore = true)
    @Mapping(target = "users", ignore = true)
    Notification toNotification(NotificationCreationRequest request);

    @Named("mapUserIds")
    default Set<String> mapUserIds(Set<User> users) {
        if (users == null) return null;
        return users.stream().map(User::getId).collect(java.util.stream.Collectors.toSet());
    }

    @Named("mapUserNames")
    default Set<String> mapUserNames(Set<User> users) {
        if (users == null) return null;
        return users.stream().map(User::getFullName).collect(java.util.stream.Collectors.toSet());
    }
}
