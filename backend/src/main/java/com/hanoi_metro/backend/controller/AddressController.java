package com.hanoi_metro.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import com.hanoi_metro.backend.dto.request.AddressCreationRequest;
import com.hanoi_metro.backend.dto.request.AddressUpdateRequest;
import com.hanoi_metro.backend.dto.request.ApiResponse;
import com.hanoi_metro.backend.dto.response.AddressResponse;
import com.hanoi_metro.backend.service.AddressService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/addresses")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AddressController {
    AddressService addressService;

    @PostMapping
    ApiResponse<AddressResponse> createAddress(@RequestBody @Valid AddressCreationRequest request) {
        AddressResponse result = addressService.createAddress(request);
        return ApiResponse.<AddressResponse>builder()
                .result(result)
                .build();
    }

    @GetMapping
    ApiResponse<List<AddressResponse>> getMyAddresses() {
        return ApiResponse.<List<AddressResponse>>builder()
                .result(addressService.getMyAddresses())
                .build();
    }

    @GetMapping("/{addressId}")
    ApiResponse<AddressResponse> getAddress(@PathVariable String addressId) {
        return ApiResponse.<AddressResponse>builder()
                .result(addressService.getAddressById(addressId))
                .build();
    }

    @PutMapping("/{addressId}")
    ApiResponse<AddressResponse> updateAddress(
            @PathVariable String addressId,
            @RequestBody @Valid AddressUpdateRequest request) {
        try {
            AddressResponse result = addressService.updateAddress(addressId, request);
            return ApiResponse.<AddressResponse>builder()
                    .result(result)
                    .build();
        } catch (Exception e) {
            log.error("Controller: updateAddress failed - addressId: {}, error: {}", addressId, e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/{addressId}")
    ApiResponse<String> deleteAddress(@PathVariable String addressId) {
        addressService.deleteAddress(addressId);
        return ApiResponse.<String>builder()
                .result("Address has been deleted")
                .build();
    }

    @PutMapping("/{addressId}/set-default")
    ApiResponse<AddressResponse> setDefaultAddress(@PathVariable String addressId) {
        AddressResponse result = addressService.setDefaultAddress(addressId);
        return ApiResponse.<AddressResponse>builder()
                .result(result)
                .build();
    }
}

