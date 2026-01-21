package com.hanoi_metro.backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hanoi_metro.backend.dto.request.RoleRequest;
import com.hanoi_metro.backend.dto.response.RoleResponse;
import com.hanoi_metro.backend.entity.Role;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    @Mapping(
            target = "permissions",
            ignore = true) // ignore vì kiểu dữ liệu của permissions trong request khác permission và response
    Role toRole(RoleRequest request);

    RoleResponse toRoleResponse(Role role);
}
