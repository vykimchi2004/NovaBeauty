package com.nova_beauty.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.request.AddressCreationRequest;
import com.nova_beauty.backend.dto.request.AddressUpdateRequest;
import com.nova_beauty.backend.dto.response.AddressResponse;
import com.nova_beauty.backend.entity.Address;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.AddressMapper;
import com.nova_beauty.backend.repository.AddressRepository;
import com.nova_beauty.backend.repository.OrderRepository;
import com.nova_beauty.backend.repository.UserRepository;
import com.nova_beauty.backend.util.SecurityUtil;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class AddressService {

    AddressRepository addressRepository;
    AddressMapper addressMapper;
    UserRepository userRepository;
    OrderRepository orderRepository;

    @Transactional
    public AddressResponse createAddress(AddressCreationRequest request) {
        User currentUser = getCurrentUser();

        Address address = addressMapper.toAddress(request);
        address.setCreatedAt(LocalDateTime.now());
        address.setUpdatedAt(LocalDateTime.now());
        address.setCountry("Việt Nam"); // Default country
        address.setDefaultAddress(request.isDefaultAddress());

        if (request.isDefaultAddress()) {
            unsetOtherDefaults(currentUser, null);
        }

        Address savedAddress = addressRepository.save(address);

        currentUser.getAddresses().add(savedAddress);
        userRepository.save(currentUser);

        log.info("Address created with ID: {} for user: {}", savedAddress.getAddressId(), currentUser.getEmail());
        return addressMapper.toAddressResponse(savedAddress);
    }

    public AddressResponse getAddressById(String addressId) {
        User currentUser = getCurrentUser();
        Address address = getOwnedAddress(addressId, currentUser);

        return addressMapper.toAddressResponse(address);
    }

    public List<AddressResponse> getMyAddresses() {
        User currentUser = getCurrentUser();

        return currentUser.getAddresses().stream()
                .map(addressMapper::toAddressResponse)
                .toList();
    }

    @Transactional
    public AddressResponse updateAddress(String addressId, AddressUpdateRequest request) {
        User currentUser = getCurrentUser();
        Address address = getOwnedAddress(addressId, currentUser);

        if (request.isDefaultAddress()) {
            unsetOtherDefaults(currentUser, addressId);
        }

        addressMapper.updateAddress(address, request);
        address.setDefaultAddress(request.isDefaultAddress());
        address.setUpdatedAt(LocalDateTime.now());

        Address savedAddress = addressRepository.save(address);
        log.info("Address updated with ID: {} for user: {}", savedAddress.getAddressId(), currentUser.getEmail());
        return addressMapper.toAddressResponse(savedAddress);
    }

    @Transactional
    public void deleteAddress(String addressId) {
        User currentUser = getCurrentUser();
        Address address = getOwnedAddress(addressId, currentUser);

        // Prevent deleting the current default address
        if (address.isDefaultAddress()) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        // Check if address is being used by any orders
        if (orderRepository.existsByAddressAddressId(addressId)) {
            log.warn("Cannot delete address {} - it is being used by orders", addressId);
            throw new AppException(ErrorCode.ADDRESS_IN_USE);
        }

        currentUser.getAddresses().remove(address);
        userRepository.save(currentUser);

        addressRepository.delete(address);
        log.info("Address deleted with ID: {} for user: {}", addressId, currentUser.getEmail());
    }

    private User getCurrentUser() {
        String currentEmail = SecurityUtil.getCurrentUserEmail();
        return userRepository
                .findByEmail(currentEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private Address getOwnedAddress(String addressId, User owner) {
        Address address = addressRepository
                .findById(addressId)
                .orElseThrow(() -> new AppException(ErrorCode.ADDRESS_NOT_EXISTED));

        boolean ownsAddress = owner.getAddresses().stream()
                .anyMatch(addr -> addr.getAddressId().equals(addressId));

        if (!ownsAddress) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        return address;
    }

    @Transactional
    public AddressResponse setDefaultAddress(String addressId) {
        User currentUser = getCurrentUser();
        Address address = getOwnedAddress(addressId, currentUser);

        // Unset other default addresses
        unsetOtherDefaults(currentUser, addressId);

        // Set this address as default
        address.setDefaultAddress(true);
        address.setUpdatedAt(LocalDateTime.now());

        Address savedAddress = addressRepository.save(address);
        log.info("Address set as default with ID: {} for user: {}", savedAddress.getAddressId(),
                currentUser.getEmail());
        return addressMapper.toAddressResponse(savedAddress);
    }

    private void unsetOtherDefaults(User currentUser, String excludeAddressId) {
        currentUser.getAddresses().stream()
                .filter(Address::isDefaultAddress)
                .filter(addr -> excludeAddressId == null || !addr.getAddressId().equals(excludeAddressId))
                .forEach(addr -> {
                    addr.setDefaultAddress(false);
                    addressRepository.save(addr);
                });
    }
}
