package com.nova_beauty.backend.mapper;

import org.mapstruct.Mapper;

import com.nova_beauty.backend.dto.request.PermissionRequest;
import com.nova_beauty.backend.dto.response.PermissionResponse;
import com.nova_beauty.backend.entity.Permission;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toPermission(PermissionRequest request);

    PermissionResponse toPermissionResponse(Permission permission);
}
