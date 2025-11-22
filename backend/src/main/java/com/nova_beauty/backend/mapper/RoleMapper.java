package com.nova_beauty.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.nova_beauty.backend.dto.request.RoleRequest;
import com.nova_beauty.backend.dto.response.RoleResponse;
import com.nova_beauty.backend.entity.Role;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    @Mapping(
            target = "permissions",
            ignore = true) // ignore vì kiểu dữ liệu của permissions trong request khác permission và response
    Role toRole(RoleRequest request);

    RoleResponse toRoleResponse(Role role);
}
