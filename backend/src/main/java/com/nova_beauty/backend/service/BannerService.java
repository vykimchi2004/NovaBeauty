package com.nova_beauty.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.request.BannerCreationRequest;
import com.nova_beauty.backend.dto.request.BannerUpdateRequest;
import com.nova_beauty.backend.dto.response.BannerResponse;
import com.nova_beauty.backend.entity.Banner;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.BannerMapper;
import com.nova_beauty.backend.repository.BannerRepository;
import com.nova_beauty.backend.repository.ProductRepository;
import com.nova_beauty.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class BannerService {

    BannerRepository bannerRepository;
    UserRepository userRepository;
    ProductRepository productRepository;
    BannerMapper bannerMapper;

    @Transactional
    @PreAuthorize("hasRole('STAFF')")
    public BannerResponse createBanner(BannerCreationRequest request) {
        // Get current user from security context
        var context = SecurityContextHolder.getContext();
        String userEmail = context.getAuthentication().getName();

        // Get user by email (getName() returns email, not ID)
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Create banner entity using mapper
        Banner banner = bannerMapper.toBanner(request);
        banner.setCreatedBy(user);
        banner.setCreatedAt(LocalDateTime.now());
        banner.setUpdatedAt(LocalDateTime.now());
        // Staff tạo banner tự động được duyệt, không cần admin duyệt
        banner.setStatus(Boolean.TRUE);
        banner.setPendingReview(Boolean.FALSE);

        // Set order index if not provided
        if (banner.getOrderIndex() == null) {
            Integer maxOrderIndex = bannerRepository.findMaxOrderIndex();
            banner.setOrderIndex(maxOrderIndex != null ? maxOrderIndex + 1 : 0);
        }

        // Set products if provided
        if (request.getProductIds() != null && !request.getProductIds().isEmpty()) {
            List<Product> products = request.getProductIds().stream()
                    .map(productId -> productRepository
                            .findById(productId)
                            .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED)))
                    .collect(Collectors.toList());
            banner.setProducts(products);
        }

        Banner savedBanner = bannerRepository.save(banner);
        log.info("Banner created with ID: {} by user: {}", savedBanner.getId(), userEmail);

        return bannerMapper.toResponse(savedBanner);
    }

    public BannerResponse getBannerById(String bannerId) {
        Banner banner =
                bannerRepository.findById(bannerId).orElseThrow(() -> new AppException(ErrorCode.BANNER_NOT_EXISTED));

        return bannerMapper.toResponse(banner);
    }

    public List<BannerResponse> getAllBanners() {
        List<Banner> banners = bannerRepository.findAllByOrderByOrderIndexAsc();

        return banners.stream().map(bannerMapper::toResponse).toList();
    }

    public List<BannerResponse> getActiveBanners() {
        List<Banner> banners = bannerRepository.findByStatusOrderByOrderIndexAsc(true);

        return banners.stream().map(bannerMapper::toResponse).toList();
    }

    @Transactional
    public BannerResponse updateBanner(String bannerId, BannerUpdateRequest request) {
        var context = SecurityContextHolder.getContext();
        String userEmail = context.getAuthentication().getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Banner banner =
                bannerRepository.findById(bannerId).orElseThrow(() -> new AppException(ErrorCode.BANNER_NOT_EXISTED));

        // Kiá»ƒm tra quyá»n: Admin hoáº·c chá»§ sá»Ÿ há»¯u banner
        boolean isAdmin = context.getAuthentication().getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin && (banner.getCreatedBy() == null || !banner.getCreatedBy().getId().equals(user.getId()))) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Update only non-null fields to preserve existing values
        if (request.getTitle() != null) {
            banner.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            banner.setDescription(request.getDescription());
        }
        if (request.getImageUrl() != null) {
            banner.setImageUrl(request.getImageUrl());
        }
        if (request.getLinkUrl() != null) {
            banner.setLinkUrl(request.getLinkUrl());
        }
        // Staff và Admin đều có thể cập nhật banner, không cần duyệt lại
        if (request.getStatus() != null) {
            banner.setStatus(request.getStatus());
            if (request.getStatus()) {
                banner.setPendingReview(Boolean.FALSE);
            }
        } else if (!isAdmin) {
            // Nếu staff không chỉ định status, giữ nguyên status hiện tại
            // Không cần set về chờ duyệt vì banner đã được tự động duyệt khi tạo
        }
        // Staff khÃ´ng Ä‘Æ°á»£c phÃ©p thay Ä‘á»•i rejectionReason, chá»‰ ADMIN má»›i cÃ³ quyá»n nÃ y
        if (request.getRejectionReason() != null && isAdmin) {
            banner.setRejectionReason(request.getRejectionReason());
            banner.setPendingReview(Boolean.FALSE);
        }
        // Staff khÃ´ng Ä‘Æ°á»£c phÃ©p thay Ä‘á»•i orderIndex, chá»‰ ADMIN má»›i cÃ³ quyá»n nÃ y
        if (request.getOrderIndex() != null && isAdmin) {
            banner.setOrderIndex(request.getOrderIndex());
        }
        if (request.getStartDate() != null) {
            banner.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            banner.setEndDate(request.getEndDate());
        }

        if (request.getIsMagazine() != null) {
            banner.setIsMagazine(request.getIsMagazine());
        }

        if (request.getCategory() != null) {
            banner.setCategory(request.getCategory());
        }

        banner.setUpdatedAt(LocalDateTime.now());

        // Update products if provided
        if (request.getProductIds() != null) {
            if (request.getProductIds().isEmpty()) {
                banner.setProducts(null);
            } else {
                List<Product> products = request.getProductIds().stream()
                        .map(productId -> productRepository
                                .findById(productId)
                                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED)))
                        .collect(Collectors.toList());
                banner.setProducts(products);
            }
        }

        Banner savedBanner = bannerRepository.save(banner);
        log.info(
                "Banner updated: {} by user: {}",
                bannerId,
                userEmail);

        return bannerMapper.toResponse(savedBanner);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public void deleteBanner(String bannerId) {
        Banner banner =
                bannerRepository.findById(bannerId).orElseThrow(() -> new AppException(ErrorCode.BANNER_NOT_EXISTED));

        bannerRepository.delete(banner);
        log.info(
                "Banner deleted: {} by user: {}",
                bannerId,
                SecurityContextHolder.getContext().getAuthentication().getName());
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public BannerResponse updateBannerOrder(String bannerId, Integer newOrderIndex) {
        Banner banner =
                bannerRepository.findById(bannerId).orElseThrow(() -> new AppException(ErrorCode.BANNER_NOT_EXISTED));

        banner.setOrderIndex(newOrderIndex);
        banner.setUpdatedAt(LocalDateTime.now());

        Banner savedBanner = bannerRepository.save(banner);
        log.info("Banner order updated: {} to order: {}", bannerId, newOrderIndex);

        return bannerMapper.toResponse(savedBanner);
    }
}
