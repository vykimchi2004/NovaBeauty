package com.nova_beauty.backend.service;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
        promotion.setIsActive(false); // ChÆ°a active cho Ä‘áº¿n khi Ä‘Æ°á»£c approve
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
            
            // Chá»‰ activate vÃ  apply ngay náº¿u startDate Ä‘Ã£ Ä‘áº¿n, náº¿u chÆ°a thÃ¬ Ä‘á»ƒ scheduled task tá»± Ä‘á»™ng activate
            LocalDate today = LocalDate.now();
            if (promotion.getStartDate() != null && !promotion.getStartDate().isAfter(today)) {
                // StartDate Ä‘Ã£ Ä‘áº¿n hoáº·c hÃ´m nay - activate vÃ  apply ngay
                promotion.setIsActive(true);
                applyPromotionToTargets(promotion);
            } else {
                // StartDate chÆ°a Ä‘áº¿n - set isActive = false, scheduled task sáº½ tá»± Ä‘á»™ng activate khi Ä‘áº¿n startDate
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

    // Cho phÃ©p cáº£ admin vÃ  staff xem promotions theo status
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

        // Náº¿u staff cáº­p nháº­t promotion bá»‹ tá»« chá»‘i, tá»± Ä‘á»™ng chuyá»ƒn vá» chá» duyá»‡t
        if (!isAdmin && promotion.getStatus() == PromotionStatus.REJECTED) {
            promotion.setStatus(PromotionStatus.PENDING_APPROVAL);
            promotion.setRejectionReason(null); // XÃ³a lÃ½ do tá»« chá»‘i khi gá»­i láº¡i
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

        // KhÃ´i phá»¥c giÃ¡ cÃ¡c sáº£n pháº©m Ä‘ang Ã¡p dá»¥ng promotion nÃ y (náº¿u cÃ³)
        clearPromotionPricing(promotion);

        // 1. XÃ³a product khá»i promotion.productApply (báº£ng promotion_products)
        // Láº¥y táº¥t cáº£ products trong productApply Ä‘á»ƒ xÃ³a quan há»‡
        Set<Product> productsInPromotion = new HashSet<>(promotion.getProductApply());
        promotion.getProductApply().clear();
        promotionRepository.save(promotion);

        // 2. Set product.promotion = null cho cÃ¡c products cÃ³ promotion nÃ y trá»±c tiáº¿p
        List<Product> productsWithDirectPromotion = productRepository.findByPromotionId(promotionId);
        for (Product product : productsWithDirectPromotion) {
            if (product.getPromotion() != null && product.getPromotion().getId().equals(promotionId)) {
                product.setPromotion(null);
                productRepository.save(product);
            }
        }

        // 3. XÃ³a file media váº­t lÃ½ trong thÆ° má»¥c promotions (náº¿u cÃ³)
        deleteMediaFileIfExists(promotion);

        // 4. XÃ³a promotion
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
        // Chá»‰ Ã¡p dá»¥ng promotion Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t (APPROVED)
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
            // Kiá»ƒm tra promotion hiá»‡n táº¡i cá»§a sáº£n pháº©m
            if (product.getPromotion() != null 
                    && !promotion.getId().equals(product.getPromotion().getId())) {
                Promotion existingPromo = product.getPromotion();
                
                // Kiá»ƒm tra xem promotion hiá»‡n táº¡i cÃ²n active khÃ´ng
                boolean isExistingActive = existingPromo.getStatus() == PromotionStatus.APPROVED
                        && (existingPromo.getIsActive())
                        && (existingPromo.getExpiryDate() == null || !existingPromo.getExpiryDate().isBefore(today))
                        && (existingPromo.getStartDate() == null || !existingPromo.getStartDate().isAfter(today));
                
                if (isExistingActive) {
                    // Kiá»ƒm tra date range overlap
                    boolean hasDateOverlap = hasDateRangeOverlap(
                            promotion.getStartDate(), promotion.getExpiryDate(),
                            existingPromo.getStartDate(), existingPromo.getExpiryDate());
                    
                    if (hasDateOverlap) {
                        conflicted.add(product.getId());
                        conflictedNames.add(product.getName());
                    }
                }
            }
            
            // Kiá»ƒm tra cÃ¡c promotion khÃ¡c cÃ³ thá»ƒ Ã¡p dá»¥ng cho sáº£n pháº©m nÃ y (theo product hoáº·c category)
            List<Promotion> otherActivePromotions = new ArrayList<>();
            
            // TÃ¬m theo product
            if (product.getId() != null) {
                otherActivePromotions.addAll(
                        promotionRepository.findActiveByProductId(product.getId(), today).stream()
                                .filter(p -> !p.getId().equals(promotion.getId()))
                                .toList());
            }
            
            // TÃ¬m theo category
            if (product.getCategory() != null && product.getCategory().getId() != null) {
                otherActivePromotions.addAll(
                        promotionRepository.findActiveByCategoryId(product.getCategory().getId(), today).stream()
                                .filter(p -> !p.getId().equals(promotion.getId()))
                                .toList());
            }
            
            // Kiá»ƒm tra date range overlap vá»›i cÃ¡c promotion khÃ¡c
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
                    "KhÃ´ng thá»ƒ Ã¡p dá»¥ng khuyáº¿n mÃ£i. CÃ¡c sáº£n pháº©m sau Ä‘Ã£ cÃ³ khuyáº¿n mÃ£i Ä‘ang hoáº¡t Ä‘á»™ng trong khoáº£ng thá»i gian trÃ¹ng láº·p: %s. " +
                    "Vui lÃ²ng chá»n: 'Thay Ä‘á»•i chÆ°Æ¡ng trÃ¬nh khuyáº¿n mÃ£i sang chÆ°Æ¡ng trÃ¬nh má»›i' hoáº·c 'Giá»¯ nguyÃªn, khÃ´ng Ã¡p promotion má»›i cho sáº£n pháº©m nÃ y'",
                    String.join(", ", conflictedNames));
            throw new AppException(ErrorCode.PROMOTION_PRODUCT_CONFLICT, errorMessage);
        }
    }
    
    /**
     * Kiá»ƒm tra xem hai khoáº£ng thá»i gian cÃ³ trÃ¹ng láº·p khÃ´ng
     * @param start1 NgÃ y báº¯t Ä‘áº§u cá»§a promotion 1
     * @param end1 NgÃ y káº¿t thÃºc cá»§a promotion 1
     * @param start2 NgÃ y báº¯t Ä‘áº§u cá»§a promotion 2
     * @param end2 NgÃ y káº¿t thÃºc cá»§a promotion 2
     * @return true náº¿u cÃ³ overlap
     */
    private boolean hasDateRangeOverlap(LocalDate start1, LocalDate end1, LocalDate start2, LocalDate end2) {
        if (start1 == null || end1 == null || start2 == null || end2 == null) {
            return false; // Náº¿u thiáº¿u thÃ´ng tin, khÃ´ng thá»ƒ xÃ¡c Ä‘á»‹nh overlap
        }
        
        // Hai khoáº£ng thá»i gian overlap náº¿u:
        // start1 <= end2 && start2 <= end1
        return !start1.isAfter(end2) && !start2.isAfter(end1);
    }

    private void applyPricingForProducts(Promotion promotion, List<Product> products) {
        if (products.isEmpty()) return;

        for (Product product : products) {
            double unitPrice = product.getUnitPrice() != null ? product.getUnitPrice() : 0.0;
            double tax = product.getTax() != null ? product.getTax() : 0.0; // tax lÃ  pháº§n trÄƒm (0.1 = 10%)
            
            // TÃ­nh discountValue tá»« promotion
            double discountAmount = calculateDiscountAmount(promotion, unitPrice);
            
            // TÃ­nh price = unitPrice * (1 + tax) - discountValue
            double finalPrice = Math.max(0, unitPrice * (1 + tax) - discountAmount);

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
            double tax = product.getTax() != null ? product.getTax() : 0.0; // tax lÃ  pháº§n trÄƒm (0.1 = 10%)
            
            // Kiá»ƒm tra xem cÃ³ promotion káº¿ tiáº¿p nÃ o cÃ²n hiá»‡u lá»±c khÃ´ng
            Promotion nextPromotion = findNextActivePromotionForProduct(product, today);
            
            if (nextPromotion != null) {
                // Ãp dá»¥ng promotion káº¿ tiáº¿p
                double discountAmount = calculateDiscountAmount(nextPromotion, unitPrice);
                double finalPrice = Math.max(0, unitPrice + (tax * unitPrice) - discountAmount);
                
                product.setDiscountValue(discountAmount);
                product.setPrice(finalPrice);
                product.setPromotion(nextPromotion);
            } else {
                // KhÃ´ng cÃ³ promotion káº¿ tiáº¿p, khÃ´i phá»¥c vá» giÃ¡ gá»‘c
                // price = unitPrice + tax * unitPrice (khÃ´ng cÃ³ discount)
                product.setDiscountValue(0.0);
                product.setPrice(unitPrice + (tax * unitPrice));
                product.setPromotion(null);
            }
        }
        productRepository.saveAll(products);
    }
    
    /**
     * TÃ¬m promotion káº¿ tiáº¿p cÃ²n hiá»‡u lá»±c cho sáº£n pháº©m
     * (promotion cÃ³ date range overlap hoáº·c tiáº¿p ná»‘i vá»›i promotion hiá»‡n táº¡i)
     */
    private Promotion findNextActivePromotionForProduct(Product product, LocalDate today) {
        // TÃ¬m cÃ¡c promotion active cho sáº£n pháº©m nÃ y (theo product hoáº·c category)
        List<Promotion> activePromotions = new ArrayList<>();
        
        // TÃ¬m theo product
        if (product.getId() != null) {
            activePromotions.addAll(promotionRepository.findActiveByProductId(product.getId(), today));
        }
        
        // TÃ¬m theo category
        if (product.getCategory() != null && product.getCategory().getId() != null) {
            activePromotions.addAll(promotionRepository.findActiveByCategoryId(product.getCategory().getId(), today));
        }
        
        // Loáº¡i bá» trÃ¹ng láº·p vÃ  sáº¯p xáº¿p theo startDate
        return activePromotions.stream()
                .distinct() // Loáº¡i bá» trÃ¹ng láº·p
                .filter(p -> p.getStatus() == PromotionStatus.APPROVED 
                        && (p.getIsActive())
                        && (p.getExpiryDate() == null || !p.getExpiryDate().isBefore(today))
                        && (p.getStartDate() == null || !p.getStartDate().isAfter(today)))
                .min(Comparator.comparing(Promotion::getStartDate)) // Sáº¯p xáº¿p theo startDate
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
        if (url == null || url.isBlank()) return;
        try {
            String filename = null;
            try {
                URI uri = URI.create(url);
                String path = uri.getPath();
                if (path != null && !path.isBlank()) {
                    // Loáº¡i bá» context path náº¿u cÃ³ (vÃ­ dá»¥: /lumina_book)
                    if (path.startsWith("/lumina_book")) {
                        path = path.substring("/lumina_book".length());
                    }
                    // TÃ¬m pháº§n path sau /promotion_media/ hoáº·c legacy /promotions/
                    if (path.contains("/promotion_media/")) {
                        int promotionsIndex = path.indexOf("/promotion_media/");
                        filename = path.substring(promotionsIndex + "/promotion_media/".length());
                    } else if (path.contains("/promotions/")) {
                        int promotionsIndex = path.indexOf("/promotions/");
                        filename = path.substring(promotionsIndex + "/promotions/".length());
                    } else {
                        // Náº¿u khÃ´ng cÃ³ /promotions/, láº¥y filename tá»« cuá»‘i path
                        int lastSlash = path.lastIndexOf('/');
                        if (lastSlash >= 0 && lastSlash < path.length() - 1) {
                            filename = path.substring(lastSlash + 1);
                        }
                    }
                }
            } catch (IllegalArgumentException ignored) { }

            if (filename == null) {
                String path = url;
                // Loáº¡i bá» protocol vÃ  domain náº¿u cÃ³
                if (path.startsWith("http://") || path.startsWith("https://")) {
                    try {
                        java.net.URI uri = java.net.URI.create(path);
                        path = uri.getPath();
                    } catch (Exception ignored) { }
                }
                // Loáº¡i bá» context path náº¿u cÃ³
                if (path.startsWith("/lumina_book")) {
                    path = path.substring("/lumina_book".length());
                }
                if (path.startsWith("/")) path = path.substring(1);
                if (path.startsWith("uploads/promotions/")) {
                    filename = path.substring("uploads/promotions/".length());
                } else if (path.startsWith("promotion_media/")) {
                    filename = path.substring("promotion_media/".length());
                } else if (path.startsWith("promotions/")) {
                    filename = path.substring("promotions/".length());
                }
            }

            if (filename == null && !url.contains("/")) {
                filename = url;
            }

            if (filename == null || filename.isBlank()) return;

            // XÃ¡c Ä‘á»‹nh thÆ° má»¥c dá»±a trÃªn URL (máº·c Ä‘á»‹nh lÃ  uploads/promotions)
            Path targetDir = Paths.get("uploads", "promotions");
            Path filePath = targetDir.resolve(filename);
            boolean deleted = Files.deleteIfExists(filePath);

            if (!deleted) {
                Path legacyDir = Paths.get("promotions");
                Path legacyPath = legacyDir.resolve(filename);
                deleted = Files.deleteIfExists(legacyPath);
                // if (deleted) {
                //     log.info("Deleted media file from legacy folder: {}", legacyPath.toAbsolutePath());
                // }
            } else {
                log.info("Deleted media file: {}", filePath.toAbsolutePath());
            }
        } catch (Exception e) {
            log.warn("Could not delete media file for url {}: {}", url, e.getMessage());
        }
    }
}
