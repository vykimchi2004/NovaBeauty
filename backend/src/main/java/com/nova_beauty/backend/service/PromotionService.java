package com.nova_beauty.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.Comparator;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.request.ApprovePromotionRequest;
import com.nova_beauty.backend.dto.request.PromotionCreationRequest;
import com.nova_beauty.backend.dto.request.PromotionUpdateRequest;
import com.nova_beauty.backend.dto.response.PromotionResponse;
import com.nova_beauty.backend.entity.Category;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.Promotion;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.enums.DiscountApplyScope;
import com.nova_beauty.backend.enums.ProductStatus;
import com.nova_beauty.backend.enums.PromotionStatus;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.PromotionMapper;
import com.nova_beauty.backend.repository.CategoryRepository;
import com.nova_beauty.backend.repository.ProductRepository;
import com.nova_beauty.backend.repository.PromotionRepository;
import com.nova_beauty.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PromotionService {

    PromotionRepository promotionRepository;
    UserRepository userRepository;
    CategoryRepository categoryRepository;
    ProductRepository productRepository;
    PromotionMapper promotionMapper;
    FileStorageService fileStorageService;

    @Transactional
    public PromotionResponse createPromotion(PromotionCreationRequest request) {
        // Get current user from security context
        User staff = getCurrentUser();

        // Check code uniqueness
        if (promotionRepository.existsByCode(request.getCode())) {
            throw new AppException(ErrorCode.PROMOTION_CODE_ALREADY_EXISTS);
        }

        // Create promotion entity using mapper
        Promotion promotion = promotionMapper.toPromotion(request);

        // Set workflow fields
        promotion.setUsageCount(0);
        promotion.setIsActive(false); // Chưa active cho đến khi được approve
        promotion.setStatus(PromotionStatus.PENDING_APPROVAL);
        promotion.setSubmittedBy(staff);
        promotion.setSubmittedAt(LocalDateTime.now());

        applyScopeTargets(request.getApplyScope(), request.getCategoryIds(), request.getProductIds(), promotion);

        Promotion savedPromotion = promotionRepository.save(promotion);
        log.info("Promotion created with ID: {} by staff: {}", savedPromotion.getId(), staff.getId());

        return promotionMapper.toResponse(savedPromotion);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PromotionResponse approvePromotion(ApprovePromotionRequest request) {
        // Get current admin from security context
        User admin = getCurrentUser();

        // Get promotion
        Promotion promotion = promotionRepository
                .findById(request.getPromotionId())
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_EXISTED));

        if (promotion.getStatus() != PromotionStatus.PENDING_APPROVAL) {
            throw new AppException(ErrorCode.PROMOTION_NOT_PENDING);
        }

        if ("APPROVE".equals(request.getAction())) {
            promotion.setStatus(PromotionStatus.APPROVED);
            promotion.setApprovedBy(admin);
            promotion.setApprovedAt(LocalDateTime.now());
            
            // Chỉ activate và apply ngay nếu startDate đã đến, nếu chưa thì để scheduled task tự động activate
            LocalDate today = LocalDate.now();
            if (promotion.getStartDate() != null && !promotion.getStartDate().isAfter(today)) {
                // StartDate đã đến hoặc hôm nay - activate và apply ngay
                promotion.setIsActive(true);
                applyPromotionToTargets(promotion);
            } else {
                // StartDate chưa đến - set isActive = false, scheduled task sẽ tự động activate khi đến startDate
                promotion.setIsActive(false);
            }
            // log.info("Promotion approved: {} by admin: {}", promotion.getId(), admin.getId());
        } else if ("REJECT".equals(request.getAction())) {
            promotion.setStatus(PromotionStatus.REJECTED);
            promotion.setApprovedBy(admin);
            promotion.setApprovedAt(LocalDateTime.now());
            promotion.setRejectionReason(request.getReason());
            promotion.setIsActive(false);
            // log.info("Promotion rejected: {} by admin: {}", promotion.getId(), admin.getId());
        }

        Promotion savedPromotion = promotionRepository.save(promotion);
        return promotionMapper.toResponse(savedPromotion);
    }

    public PromotionResponse getPromotionById(String promotionId) {
        Promotion promotion = promotionRepository
                .findById(promotionId)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_EXISTED));

        return promotionMapper.toResponse(promotion);
    }

    public List<PromotionResponse> getAllPromotions() {
        List<Promotion> promotions = promotionRepository.findAll();
        return promotions.stream().map(promotionMapper::toResponse).collect(Collectors.toList());
    }

    public List<PromotionResponse> getMyPromotions() {
        // Get current user from security context
        User staff = getCurrentUser();

        List<Promotion> promotions = promotionRepository.findBySubmittedBy(staff);

        return promotions.stream().map(promotionMapper::toResponse).collect(Collectors.toList());
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<PromotionResponse> getPendingPromotions() {
        List<Promotion> pendingPromotions = promotionRepository.findByStatus(PromotionStatus.PENDING_APPROVAL);

        return pendingPromotions.stream().map(promotionMapper::toResponse).collect(Collectors.toList());
    }

    // Cho phép cả admin và staff xem promotions theo status
    public List<PromotionResponse> getPromotionsByStatus(PromotionStatus status) {
        List<Promotion> promotions = promotionRepository.findByStatus(status);

        return promotions.stream().map(promotionMapper::toResponse).collect(Collectors.toList());
    }

    public List<PromotionResponse> getActivePromotions() {
        List<Promotion> activePromotions = promotionRepository.findActivePromotions(LocalDate.now());

        return activePromotions.stream().map(promotionMapper::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public PromotionResponse updatePromotion(String promotionId, PromotionUpdateRequest request) {
        // Get current user from security context
        User currentUser = getCurrentUser();
        String currentUserId = currentUser.getId();

        Promotion promotion = promotionRepository
                .findById(promotionId)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_EXISTED));

        // Check if user is the submitter or admin
        var context = SecurityContextHolder.getContext();
        boolean isAdmin = context.getAuthentication().getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin && !promotion.getSubmittedBy().getId().equals(currentUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Check code uniqueness if code is being updated
        if (request.getCode() != null && !request.getCode().equals(promotion.getCode())) {
            if (promotionRepository.existsByCode(request.getCode())) {
                throw new AppException(ErrorCode.PROMOTION_CODE_ALREADY_EXISTS);
            }
        }

        boolean wasApprovedAndActive = promotion.getStatus() == PromotionStatus.APPROVED
                && Boolean.TRUE.equals(promotion.getIsActive());
        if (wasApprovedAndActive) {
            clearPromotionPricing(promotion);
        }

        // Update promotion using mapper
        promotionMapper.updatePromotion(promotion, request);

        if (request.getApplyScope() != null || request.getCategoryIds() != null || request.getProductIds() != null) {
            DiscountApplyScope scope =
                    request.getApplyScope() != null ? request.getApplyScope() : promotion.getApplyScope();
            applyScopeTargets(scope, request.getCategoryIds(), request.getProductIds(), promotion);
            promotion.setApplyScope(scope);
        }

        // Nếu staff cập nhật promotion bị từ chối, tự động chuyển về chờ duyệt
        if (!isAdmin && promotion.getStatus() == PromotionStatus.REJECTED) {
            promotion.setStatus(PromotionStatus.PENDING_APPROVAL);
            promotion.setRejectionReason(null); // Xóa lý do từ chối khi gửi lại
        }

        Promotion savedPromotion = promotionRepository.save(promotion);
        if (wasApprovedAndActive) {
            applyPromotionToTargets(savedPromotion);
        }
        // log.info("Promotion updated: {} by user: {}", promotionId, currentUserId);

        return promotionMapper.toResponse(savedPromotion);
    }

    @Transactional
    public void deletePromotion(String promotionId) {
        // Get current user from security context
        User currentUser = getCurrentUser();
        String currentUserId = currentUser.getId();

        Promotion promotion = promotionRepository
                .findById(promotionId)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_EXISTED));

        // Check if user is the submitter or admin
        var context = SecurityContextHolder.getContext();
        boolean isAdmin = context.getAuthentication().getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin && !promotion.getSubmittedBy().getId().equals(currentUserId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Khôi phục giá các sản phẩm đang áp dụng promotion này (nếu có)
        clearPromotionPricing(promotion);

        // 1. Xóa product khỏi promotion.productApply (bảng promotion_products)
        // Lấy tất cả products trong productApply để xóa quan hệ
        Set<Product> productsInPromotion = new HashSet<>(promotion.getProductApply());
        promotion.getProductApply().clear();
        promotionRepository.save(promotion);

        // 2. Set product.promotion = null cho các products có promotion này trực tiếp
        List<Product> productsWithDirectPromotion = productRepository.findByPromotionId(promotionId);
        for (Product product : productsWithDirectPromotion) {
            if (product.getPromotion() != null && product.getPromotion().getId().equals(promotionId)) {
                product.setPromotion(null);
                productRepository.save(product);
            }
        }

        // 3. Xóa file media vật lý trong thư mục promotions (nếu có)
        deleteMediaFileIfExists(promotion);

        // 4. Xóa promotion
        promotionRepository.delete(promotion);
        // log.info("Promotion deleted: {} by user: {}", promotionId, currentUserId);
    }

    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private void applyScopeTargets(
            DiscountApplyScope scope, Set<String> categoryIds, Set<String> productIds, Promotion promotion) {
        if (scope == null) {
            throw new AppException(ErrorCode.INVALID_PROMOTION_SCOPE);
        }

        promotion.getCategoryApply().clear();
        promotion.getProductApply().clear();

        switch (scope) {
            case CATEGORY -> {
                validateScopeInputs(categoryIds, productIds, true);
                promotion.getCategoryApply().addAll(resolveCategories(categoryIds));
            }
            case PRODUCT -> {
                validateScopeInputs(categoryIds, productIds, false);
                promotion.getProductApply().addAll(resolveProducts(productIds));
            }
            case ORDER -> {
                if ((categoryIds != null && !categoryIds.isEmpty()) || (productIds != null && !productIds.isEmpty())) {
                    throw new AppException(ErrorCode.INVALID_PROMOTION_SCOPE);
                }
            }
            default -> throw new AppException(ErrorCode.INVALID_PROMOTION_SCOPE);
        }
        promotion.setApplyScope(scope);
    }

    private void validateScopeInputs(Set<String> categoryIds, Set<String> productIds, boolean isCategory) {
        if (isCategory) {
            if (productIds != null && !productIds.isEmpty()) {
                throw new AppException(ErrorCode.INVALID_PROMOTION_SCOPE);
            }
        } else {
            if (categoryIds != null && !categoryIds.isEmpty()) {
                throw new AppException(ErrorCode.INVALID_PROMOTION_SCOPE);
            }
        }
    }

    private Set<Category> resolveCategories(Set<String> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PROMOTION_SCOPE);
        }
        return resolveEntities(categoryIds, categoryRepository::findById, ErrorCode.CATEGORY_NOT_EXISTED);
    }

    private Set<Product> resolveProducts(Set<String> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PROMOTION_SCOPE);
        }
        return resolveEntities(productIds, productRepository::findById, ErrorCode.PRODUCT_NOT_EXISTED);
    }

    private <T, ID> Set<T> resolveEntities(Set<ID> ids, java.util.function.Function<ID, java.util.Optional<T>> finder, ErrorCode notFoundError) {
        return ids.stream()
                .map(id -> finder.apply(id).orElseThrow(() -> new AppException(notFoundError)))
                .collect(Collectors.toSet());
    }

    public void applyPromotionToTargets(Promotion promotion) {
        // Chỉ áp dụng promotion đã được duyệt (APPROVED)
        if (promotion.getStatus() != PromotionStatus.APPROVED) {
            log.warn("Cannot apply promotion {} because it is not approved. Status: {}", 
                    promotion.getId(), promotion.getStatus());
            return;
        }
        
        if (promotion.getApplyScope() == DiscountApplyScope.ORDER) {
            return; 
        }
        List<Product> targetProducts = resolveTargetProducts(promotion);
        if (targetProducts.isEmpty()) {
            return;
        }

        ensureProductsAvailableForPromotion(targetProducts, promotion);
        applyPricingForProducts(promotion, targetProducts);
    }

    private List<Product> resolveTargetProducts(Promotion promotion) {
        if (promotion.getApplyScope() == DiscountApplyScope.PRODUCT) {
            Set<String> productIds = promotion.getProductApply().stream()
                    .map(Product::getId)
                    .collect(Collectors.toSet());
            if (productIds.isEmpty()) {
                return Collections.emptyList();
            }
            return productRepository.findAllById(productIds).stream()
                    .filter(product -> product.getStatus() == ProductStatus.APPROVED)
                    .collect(Collectors.toList());
        } else if (promotion.getApplyScope() == DiscountApplyScope.CATEGORY) {
            Set<String> categoryIds = promotion.getCategoryApply().stream()
                    .map(Category::getId)
                    .collect(Collectors.toSet());
            if (categoryIds.isEmpty()) {
                return Collections.emptyList();
            }
            Set<Product> products = new HashSet<>();
            for (String categoryId : categoryIds) {
                products.addAll(productRepository.findByCategoryId(categoryId));
            }
            return products.stream()
                    .filter(product -> product.getStatus() == ProductStatus.APPROVED)
                    .collect(Collectors.toList());
        }
        return Collections.emptyList();
    }

    private void ensureProductsAvailableForPromotion(List<Product> products, Promotion promotion) {
        LocalDate today = LocalDate.now();
        List<String> conflicted = new ArrayList<>();
        List<String> conflictedNames = new ArrayList<>();
        
        for (Product product : products) {
            // Kiểm tra promotion hiện tại của sản phẩm
            if (product.getPromotion() != null 
                    && !promotion.getId().equals(product.getPromotion().getId())) {
                Promotion existingPromo = product.getPromotion();
                
                // Kiểm tra xem promotion hiện tại còn active không
                boolean isExistingActive = existingPromo.getStatus() == PromotionStatus.APPROVED
                        && (existingPromo.getIsActive())
                        && (existingPromo.getExpiryDate() == null || !existingPromo.getExpiryDate().isBefore(today))
                        && (existingPromo.getStartDate() == null || !existingPromo.getStartDate().isAfter(today));
                
                if (isExistingActive) {
                    // Kiểm tra date range overlap
                    boolean hasDateOverlap = hasDateRangeOverlap(
                            promotion.getStartDate(), promotion.getExpiryDate(),
                            existingPromo.getStartDate(), existingPromo.getExpiryDate());
                    
                    if (hasDateOverlap) {
                        conflicted.add(product.getId());
                        conflictedNames.add(product.getName());
                    }
                }
            }
            
            // Kiểm tra các promotion khác có thể áp dụng cho sản phẩm này (theo product hoặc category)
            List<Promotion> otherActivePromotions = new ArrayList<>();
            
            // Tìm theo product
            if (product.getId() != null) {
                otherActivePromotions.addAll(
                        promotionRepository.findActiveByProductId(product.getId(), today).stream()
                                .filter(p -> !p.getId().equals(promotion.getId()))
                                .toList());
            }
            
            // Tìm theo category
            if (product.getCategory() != null && product.getCategory().getId() != null) {
                otherActivePromotions.addAll(
                        promotionRepository.findActiveByCategoryId(product.getCategory().getId(), today).stream()
                                .filter(p -> !p.getId().equals(promotion.getId()))
                                .toList());
            }
            
            // Kiểm tra date range overlap với các promotion khác
            for (Promotion otherPromo : otherActivePromotions) {
                boolean hasDateOverlap = hasDateRangeOverlap(
                        promotion.getStartDate(), promotion.getExpiryDate(),
                        otherPromo.getStartDate(), otherPromo.getExpiryDate());
                
                if (hasDateOverlap && !conflicted.contains(product.getId())) {
                    conflicted.add(product.getId());
                    conflictedNames.add(product.getName());
                }
            }
        }
        
        if (!conflicted.isEmpty()) {
            log.warn("Cannot apply promotion {} due to date range conflicts on products {}", promotion.getId(), conflicted);
            String errorMessage = String.format(
                    "Không thể áp dụng khuyến mãi. Các sản phẩm sau đã có khuyến mãi đang hoạt động trong khoảng thời gian trùng lặp: %s. " +
                    "Vui lòng chọn: 'Thay đổi chương trình khuyến mãi sang chương trình mới' hoặc 'Giữ nguyên, không áp promotion mới cho sản phẩm này'",
                    String.join(", ", conflictedNames));
            throw new AppException(ErrorCode.PROMOTION_PRODUCT_CONFLICT, errorMessage);
        }
    }
    
    /**
     * Kiểm tra xem hai khoảng thời gian có trùng lặp không
     * @param start1 Ngày bắt đầu của promotion 1
     * @param end1 Ngày kết thúc của promotion 1
     * @param start2 Ngày bắt đầu của promotion 2
     * @param end2 Ngày kết thúc của promotion 2
     * @return true nếu có overlap
     */
    private boolean hasDateRangeOverlap(LocalDate start1, LocalDate end1, LocalDate start2, LocalDate end2) {
        if (start1 == null || end1 == null || start2 == null || end2 == null) {
            return false; // Nếu thiếu thông tin, không thể xác định overlap
        }
        
        // Hai khoảng thời gian overlap nếu:
        // start1 <= end2 && start2 <= end1
        return !start1.isAfter(end2) && !start2.isAfter(end1);
    }

    private void applyPricingForProducts(Promotion promotion, List<Product> products) {
        if (products.isEmpty()) return;

        for (Product product : products) {
            double unitPrice = product.getUnitPrice() != null ? product.getUnitPrice() : 0.0;
            double tax = product.getTax() != null ? product.getTax() : 0.0; // tax là phần trăm (0.1 = 10%)
            
            // Tính giá có tax trước
            double priceWithTax = unitPrice * (1 + tax);
            // Tính discountValue từ promotion (từ giá đã có tax để đảm bảo phần trăm hiển thị chính xác)
            double discountAmount = calculateDiscountAmount(promotion, priceWithTax);
            
            // Tính price = unitPrice * (1 + tax) - discountValue
            double finalPrice = Math.max(0, priceWithTax - discountAmount);

            product.setDiscountValue(discountAmount);
            product.setPrice(finalPrice);
            product.setPromotion(promotion);
        }

        productRepository.saveAll(products);
    }

    private double calculateDiscountAmount(Promotion promotion, double basePrice) {
        if (basePrice <= 0) return 0;
        double discountValue = promotion.getDiscountValue() != null ? promotion.getDiscountValue() : 0;
        double discountAmount = 0;

        switch (promotion.getDiscountValueType()) {
            case PERCENTAGE -> {
                discountAmount = basePrice * (discountValue / 100.0);
                Double maxDiscount = promotion.getMaxDiscountValue();
                if (maxDiscount != null && maxDiscount > 0) {
                    discountAmount = Math.min(discountAmount, maxDiscount);
                }
            }
            case AMOUNT -> discountAmount = discountValue;
        }
        return Math.min(discountAmount, basePrice);
    }

    private void clearPromotionPricing(Promotion promotion) {
        List<Product> products = productRepository.findByPromotionId(promotion.getId());
        if (products.isEmpty()) {
            return;
        }
        
        LocalDate today = LocalDate.now();
        
        for (Product product : products) {
            double unitPrice = product.getUnitPrice() != null ? product.getUnitPrice() : 0.0;
            double tax = product.getTax() != null ? product.getTax() : 0.0; // tax là phần trăm (0.1 = 10%)
            
            // Kiểm tra xem có promotion kế tiếp nào còn hiệu lực không
            Promotion nextPromotion = findNextActivePromotionForProduct(product, today);
            
            if (nextPromotion != null) {
                // Áp dụng promotion kế tiếp
                double priceWithTax = unitPrice * (1 + tax);
                // Calculate discount from price with tax to ensure accurate percentage display
                double discountAmount = calculateDiscountAmount(nextPromotion, priceWithTax);
                double finalPrice = Math.max(0, priceWithTax - discountAmount);
                
                product.setDiscountValue(discountAmount);
                product.setPrice(finalPrice);
                product.setPromotion(nextPromotion);
            } else {
                // Không có promotion kế tiếp, khôi phục về giá gốc
                // price = unitPrice + tax * unitPrice (không có discount)
                product.setDiscountValue(0.0);
                product.setPrice(unitPrice + (tax * unitPrice));
                product.setPromotion(null);
            }
        }
        productRepository.saveAll(products);
    }
    
    /**
     * Tìm promotion kế tiếp còn hiệu lực cho sản phẩm
     * (promotion có date range overlap hoặc tiếp nối với promotion hiện tại)
     */
    private Promotion findNextActivePromotionForProduct(Product product, LocalDate today) {
        // Tìm các promotion active cho sản phẩm này (theo product hoặc category)
        List<Promotion> activePromotions = new ArrayList<>();
        
        // Tìm theo product
        if (product.getId() != null) {
            activePromotions.addAll(promotionRepository.findActiveByProductId(product.getId(), today));
        }
        
        // Tìm theo category
        if (product.getCategory() != null && product.getCategory().getId() != null) {
            activePromotions.addAll(promotionRepository.findActiveByCategoryId(product.getCategory().getId(), today));
        }
        
        // Loại bỏ trùng lặp và sắp xếp theo startDate
        return activePromotions.stream()
                .distinct() // Loại bỏ trùng lặp
                .filter(p -> p.getStatus() == PromotionStatus.APPROVED 
                        && (p.getIsActive())
                        && (p.getExpiryDate() == null || !p.getExpiryDate().isBefore(today))
                        && (p.getStartDate() == null || !p.getStartDate().isAfter(today)))
                .min(Comparator.comparing(Promotion::getStartDate)) // Sắp xếp theo startDate
                .orElse(null);
    }

    @Transactional
    public void detachPromotionFromProducts(Promotion promotion) {
        clearPromotionPricing(promotion);
        promotion.setIsActive(false);
        promotionRepository.save(promotion);
    }

    private void deleteMediaFileIfExists(Promotion promotion) {
        try {
            if (promotion.getImageUrl() != null && !promotion.getImageUrl().isBlank()) {
                long totalUsages = promotionRepository.countByImageUrl(promotion.getImageUrl());
                if (totalUsages > 1) {
                    log.debug("Skip deleting promotion media {} because it is still referenced by {} records",
                            promotion.getImageUrl(), totalUsages - 1);
                    return;
                }
                deletePhysicalFileByUrl(promotion.getImageUrl());
            }
        } catch (Exception e) {
            log.warn("Failed to delete media file for promotion {}: {}", promotion.getId(), e.getMessage());
        }
    }

    private void deletePhysicalFileByUrl(String url) {
        // Xóa file từ Cloudinary thay vì local storage
        fileStorageService.deleteFileFromCloudinary(url);
    }
}
