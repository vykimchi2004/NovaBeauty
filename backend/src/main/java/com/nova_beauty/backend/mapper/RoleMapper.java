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
            ignore = true) // ignore vÃ¬ kiá»ƒu dá»¯ liá»‡u cá»§a permissions trong request khÃ¡c permission vÃ  response
    Role toRole(RoleRequest request);

    RoleResponse toRoleResponse(Role role);
}
