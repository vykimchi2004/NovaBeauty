package com.nova_beauty.backend.constant;

import com.nova_beauty.backend.entity.Role;

public class PredefinedRole {
    //    public static final String USER_ROLE = "USER";
    public static final Role CUSTOMER_ROLE =
            Role.builder().name("CUSTOMER").description("Customer role").build();
    public static final Role ADMIN_ROLE =
            Role.builder().name("ADMIN").description("Admin role").build();
    public static final Role STAFF_ROLE =
            Role.builder().name("STAFF").description("Staff role").build();
    public static final Role CS_ROLE = Role.builder()
            .name("CUSTOMER_SUPPORT")
            .description("Customer Support role")
            .build();

    private PredefinedRole() {}
}
