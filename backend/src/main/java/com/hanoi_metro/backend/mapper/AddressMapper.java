package com.hanoi_metro.backend.mapper;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import com.hanoi_metro.backend.dto.request.AddressCreationRequest;
import com.hanoi_metro.backend.dto.request.AddressUpdateRequest;
import com.hanoi_metro.backend.dto.response.AddressResponse;
import com.hanoi_metro.backend.entity.Address;

@Mapper(componentModel = "spring")
public interface AddressMapper {

    // Request to Entity
    @Mapping(target = "addressId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "users", ignore = true)
    @Mapping(target = "country", ignore = true)
    Address toAddress(AddressCreationRequest request);

    // Entity to Response
    @Mapping(target = "id", source = "addressId")
    AddressResponse toAddressResponse(Address address);

    // Update Entity - Bỏ qua các giá trị null để không làm mất dữ liệu
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "addressId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "users", ignore = true)
    @Mapping(target = "country", ignore = true)
    void updateAddress(@MappingTarget Address address, AddressUpdateRequest request);
}

