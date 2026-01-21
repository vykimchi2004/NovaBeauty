package com.hanoi_metro.backend.mapper;

import org.mapstruct.Mapper;

import com.hanoi_metro.backend.dto.request.PermissionRequest;
import com.hanoi_metro.backend.dto.response.PermissionResponse;
import com.hanoi_metro.backend.entity.Permission;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toPermission(PermissionRequest request);

    PermissionResponse toPermissionResponse(Permission permission);
}
