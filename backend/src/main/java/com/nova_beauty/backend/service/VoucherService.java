package com.nova_beauty.backend.service;


import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.function.Function;
import java.util.Optional;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.request.ApproveVoucherRequest;
import com.nova_beauty.backend.dto.request.VoucherCreationRequest;
import com.nova_beauty.backend.dto.request.VoucherUpdateRequest;
import com.nova_beauty.backend.dto.response.VoucherResponse;
import com.nova_beauty.backend.entity.Category;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.entity.Voucher;
import com.nova_beauty.backend.enums.DiscountApplyScope;
import com.nova_beauty.backend.enums.VoucherStatus;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.VoucherMapper;
import com.nova_beauty.backend.repository.CategoryRepository;
import com.nova_beauty.backend.repository.ProductRepository;
import com.nova_beauty.backend.repository.UserRepository;
import com.nova_beauty.backend.repository.VoucherRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class VoucherService {

    VoucherRepository voucherRepository;
    UserRepository userRepository;
    CategoryRepository categoryRepository;
    ProductRepository productRepository;
    VoucherMapper voucherMapper;
    FileStorageService fileStorageService;

    @Transactional
    public VoucherResponse createVoucher(VoucherCreationRequest request) {
        User staff = getCurrentUser();

        if (voucherRepository.existsByCode(request.getCode())) {
            throw new AppException(ErrorCode.VOUCHER_CODE_ALREADY_EXISTS);
        }

        Voucher voucher = voucherMapper.toVoucher(request);
        voucher.setSubmittedBy(staff);
        voucher.setSubmittedAt(LocalDateTime.now());
        voucher.setUsageCount(0);
        voucher.setIsActive(false);
        voucher.setStatus(VoucherStatus.PENDING_APPROVAL);

        applyScopeTargets(request.getApplyScope(), request.getCategoryIds(), request.getProductIds(), voucher);

        Voucher savedVoucher = voucherRepository.save(voucher);
        // log.info("Voucher created with ID: {} by staff: {}", savedVoucher.getId(), staff.getId());

        return voucherMapper.toResponse(savedVoucher);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public VoucherResponse approveVoucher(ApproveVoucherRequest request) {
        User admin = getCurrentUser();

        Voucher voucher = voucherRepository
                .findById(request.getVoucherId())
                .orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_EXISTED));

        if (voucher.getStatus() != VoucherStatus.PENDING_APPROVAL) {
            throw new AppException(ErrorCode.VOUCHER_NOT_PENDING);
        }

        if ("APPROVE".equals(request.getAction())) {
            voucher.setStatus(VoucherStatus.APPROVED);
            voucher.setIsActive(true);
            voucher.setApprovedBy(admin);
            voucher.setApprovedAt(LocalDateTime.now());
            voucher.setRejectionReason(null);
            // log.info("Voucher approved: {} by admin: {}", voucher.getId(), admin.getId());
        } else if ("REJECT".equals(request.getAction())) {
            voucher.setStatus(VoucherStatus.REJECTED);
            voucher.setIsActive(false);
            voucher.setApprovedBy(admin);
            voucher.setApprovedAt(LocalDateTime.now());
            voucher.setRejectionReason(request.getReason());
            // log.info("Voucher rejected: {} by admin: {}", voucher.getId(), admin.getId());
        }

        Voucher savedVoucher = voucherRepository.save(voucher);
        return voucherMapper.toResponse(savedVoucher);
    }

    public VoucherResponse getVoucherById(String voucherId) {
        Voucher voucher = voucherRepository
                .findById(voucherId)
                .orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_EXISTED));
        return voucherMapper.toResponse(voucher);
    }

    public List<VoucherResponse> getMyVouchers() {
        User staff = getCurrentUser();

        return voucherRepository.findBySubmittedBy(staff).stream()
                .map(voucherMapper::toResponse)
                .collect(Collectors.toList());
    }

    public List<VoucherResponse> getPendingVouchers() {
        return voucherRepository.findByStatus(VoucherStatus.PENDING_APPROVAL).stream()
                .map(voucherMapper::toResponse)
                .collect(Collectors.toList());
    }

    public List<VoucherResponse> getVouchersByStatus(VoucherStatus status) {
        return voucherRepository.findByStatus(status).stream()
                .map(voucherMapper::toResponse)
                .collect(Collectors.toList());
    }

    public List<VoucherResponse> getAllVouchers() {
        return voucherRepository.findAll().stream()
                .map(voucherMapper::toResponse)
                .collect(Collectors.toList());
    }

    public List<VoucherResponse> getActiveVouchers() {
        return voucherRepository.findActiveVouchers(LocalDate.now()).stream()
                .map(voucherMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public VoucherResponse updateVoucher(String voucherId, VoucherUpdateRequest request) {
        User currentUser = getCurrentUser();
        String currentUserId = currentUser.getId();

        Voucher voucher = voucherRepository
                .findById(voucherId)
                .orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_EXISTED));

        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));

        if (!isAdmin && voucher.getSubmittedBy() != null && !voucher.getSubmittedBy().getId().equals(currentUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (request.getCode() != null && !request.getCode().equals(voucher.getCode())
                && voucherRepository.existsByCode(request.getCode())) {
            throw new AppException(ErrorCode.VOUCHER_CODE_ALREADY_EXISTS);
        }

        voucherMapper.updateVoucher(voucher, request);

        if (request.getApplyScope() != null || request.getCategoryIds() != null || request.getProductIds() != null) {
            DiscountApplyScope scope = request.getApplyScope() != null ? request.getApplyScope() : voucher.getApplyScope();
            applyScopeTargets(scope, request.getCategoryIds(), request.getProductIds(), voucher);
            voucher.setApplyScope(scope);
        }

        if (!isAdmin && voucher.getStatus() == VoucherStatus.REJECTED) {
            voucher.setStatus(VoucherStatus.PENDING_APPROVAL);
            voucher.setRejectionReason(null); // XÃ³a lÃ½ do tá»« chá»‘i khi gá»­i láº¡i
        }

        Voucher savedVoucher = voucherRepository.save(voucher);
        log.info("Voucher updated: {} by user: {}", voucherId, currentUserId);

        return voucherMapper.toResponse(savedVoucher);
    }

    @Transactional
    public void deleteVoucher(String voucherId) {
        User currentUser = getCurrentUser();
        String currentUserId = currentUser.getId();

        Voucher voucher = voucherRepository
                .findById(voucherId)
                .orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_EXISTED));

        boolean isAdmin = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));

        if (!isAdmin && voucher.getSubmittedBy() != null && !voucher.getSubmittedBy().getId().equals(currentUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // 1. XÃ³a product khá»i voucher.productApply (báº£ng voucher_products)
        // Clear quan há»‡ Many-to-Many trÆ°á»›c khi xÃ³a voucher
        voucher.getProductApply().clear();
        voucher.getCategoryApply().clear();
        voucherRepository.save(voucher);

        // 2. XÃ³a file media váº­t lÃ½ trong thÆ° má»¥c vouchers (náº¿u cÃ³)
        deleteMediaFileIfExists(voucher);

        // 3. XÃ³a voucher
        String voucherCode = voucher.getCode();
        voucherRepository.delete(voucher);
        voucherRepository.flush(); // Đảm bảo xóa được thực hiện ngay
        log.info("Voucher deleted: id={}, code={}, by user: {}", voucherId, voucherCode, currentUserId);
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private void applyScopeTargets(
            DiscountApplyScope scope, Set<String> categoryIds, Set<String> productIds, Voucher voucher) {
        if (scope == null) {
            return;
        }

        voucher.getCategoryApply().clear();
        voucher.getProductApply().clear();

        switch (scope) {
            case CATEGORY -> {
                validateScopeInputs(categoryIds, productIds, true);
                voucher.getCategoryApply().addAll(resolveCategories(categoryIds));
            }
            case PRODUCT -> {
                validateScopeInputs(categoryIds, productIds, false);
                voucher.getProductApply().addAll(resolveProducts(productIds));
            }
            case ORDER -> {
                if ((categoryIds != null && !categoryIds.isEmpty()) || (productIds != null && !productIds.isEmpty())) {
                    throw new AppException(ErrorCode.INVALID_VOUCHER_SCOPE);
                }
            }
            default -> throw new AppException(ErrorCode.INVALID_VOUCHER_SCOPE);
        }
        voucher.setApplyScope(scope);
    }

    private void validateScopeInputs(Set<String> categoryIds, Set<String> productIds, boolean isCategory) {
        if (isCategory) {
            if (productIds != null && !productIds.isEmpty()) {
                throw new AppException(ErrorCode.INVALID_VOUCHER_SCOPE);
            }
        } else {
            if (categoryIds != null && !categoryIds.isEmpty()) {
                throw new AppException(ErrorCode.INVALID_VOUCHER_SCOPE);
            }
        }
    }

    private Set<Category> resolveCategories(Set<String> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_VOUCHER_SCOPE);
        }
        return resolveEntities(categoryIds, categoryRepository::findById, ErrorCode.CATEGORY_NOT_EXISTED);
    }

    private Set<Product> resolveProducts(Set<String> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_VOUCHER_SCOPE);
        }
        return resolveEntities(productIds, productRepository::findById, ErrorCode.PRODUCT_NOT_EXISTED);
    }

    private <T, ID> Set<T> resolveEntities(Set<ID> ids, Function<ID, Optional<T>> finder, ErrorCode notFoundError) {
        return ids.stream()
                .map(id -> finder.apply(id).orElseThrow(() -> new AppException(notFoundError)))
                .collect(Collectors.toSet());
    }

    private void deleteMediaFileIfExists(Voucher voucher) {
        try {
            if (voucher.getImageUrl() != null && !voucher.getImageUrl().isBlank()) {
                long totalUsages = voucherRepository.countByImageUrl(voucher.getImageUrl());
                if (totalUsages > 1) {
                    log.debug("Skip deleting voucher media {} because it is still referenced by {} records",
                            voucher.getImageUrl(), totalUsages - 1);
                    return;
                }
                deletePhysicalFileByUrl(voucher.getImageUrl());
            }
        } catch (Exception e) {
            log.warn("Failed to delete media file for voucher {}: {}", voucher.getId(), e.getMessage());
        }
    }

    private void deletePhysicalFileByUrl(String url) {
        // Xóa file từ Cloudinary thay vì local storage
        fileStorageService.deleteFileFromCloudinary(url);
    }
}


