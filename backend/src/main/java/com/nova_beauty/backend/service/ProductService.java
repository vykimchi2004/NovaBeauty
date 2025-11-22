package com.nova_beauty.backend.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Comparator;

import java.time.LocalDateTime;
import java.time.LocalDate;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.entity.*;

import com.nova_beauty.backend.dto.request.ApproveProductRequest;
import com.nova_beauty.backend.dto.request.ProductCreationRequest;
import com.nova_beauty.backend.dto.request.ProductUpdateRequest;
import com.nova_beauty.backend.dto.response.ProductResponse;
import com.nova_beauty.backend.enums.ProductStatus;
import com.nova_beauty.backend.enums.PromotionStatus;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.ProductMapper;
import com.nova_beauty.backend.repository.ProductMediaRepository;
import com.nova_beauty.backend.repository.CategoryRepository;
import com.nova_beauty.backend.repository.ProductRepository;
import com.nova_beauty.backend.repository.PromotionRepository;
import com.nova_beauty.backend.repository.VoucherRepository;
import com.nova_beauty.backend.repository.UserRepository;
import com.nova_beauty.backend.repository.CartItemRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ProductService {

    ProductRepository productRepository;
    CategoryRepository categoryRepository;
    UserRepository userRepository;
    ProductMediaRepository productMediaRepository;
    PromotionRepository promotionRepository;
    VoucherRepository voucherRepository;
    CartItemRepository cartItemRepository;
    ProductMapper productMapper;

    // ========== CREATE OPERATIONS ==========
    @Transactional
    @PreAuthorize("hasRole('STAFF')")
    public ProductResponse createProduct(ProductCreationRequest request) {
        var context = SecurityContextHolder.getContext();
        String userEmail = context.getAuthentication().getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Validate vÃ  láº¥y category
        Category category = categoryRepository
                .findById(request.getCategoryId())
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));

        // Validate vÃ  láº¥y promotion náº¿u cÃ³
        Promotion promotion = null;
        if (request.getPromotionId() != null && !request.getPromotionId().isEmpty()) {
            promotion = promotionRepository
                    .findById(request.getPromotionId())
                    .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
        }

        // Táº¡o product entity tá»« request
        Product product = productMapper.toProduct(request);
        product.setId(request.getId());
        product.setSubmittedBy(user);
        product.setCategory(category);
        product.setPromotion(promotion);
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());
        product.setQuantitySold(0);
        product.setStatus(ProductStatus.PENDING);

        // TÃ­nh toÃ¡n giÃ¡ sáº£n pháº©m
        if (request.getUnitPrice() == null || request.getUnitPrice() < 0) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
        product.setUnitPrice(request.getUnitPrice());
        product.setPrice(computeFinalPrice(request.getUnitPrice(), request.getTax(), request.getDiscountValue()));

        // Gáº¯n media (áº£nh/video) tá»« request
        attachMediaFromRequest(product, request);

        // LÆ°u sáº£n pháº©m
        try {
            Product savedProduct = productRepository.save(product);
            log.info("Product created with ID: {} by user: {}", savedProduct.getId(), user.getId());
            return productMapper.toResponse(savedProduct);
        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity violation when creating product", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    // ========== UPDATE OPERATIONS ==========

    /**
     * Cáº­p nháº­t thÃ´ng tin sáº£n pháº©m
     * Staff chá»‰ cÃ³ thá»ƒ cáº­p nháº­t sáº£n pháº©m cá»§a chÃ­nh há»
     * Admin cÃ³ thá»ƒ cáº­p nháº­t báº¥t ká»³ sáº£n pháº©m nÃ o
     */
    @Transactional
    public ProductResponse updateProduct(String productId, ProductUpdateRequest request) {
        var context = SecurityContextHolder.getContext();
        String userEmail = context.getAuthentication().getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Product product = productRepository
                .findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        // Kiá»ƒm tra quyá»n: Admin hoáº·c chá»§ sá»Ÿ há»¯u sáº£n pháº©m
        boolean isAdmin = context.getAuthentication().getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin && !product.getSubmittedBy().getId().equals(user.getId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Cáº­p nháº­t thÃ´ng tin sáº£n pháº©m
        ProductStatus originalStatus = product.getStatus(); // Lưu status hiện tại
        productMapper.updateProduct(product, request);
        // Đảm bảo status không bị null (giữ nguyên status hiện tại nếu request không có status)
        if (product.getStatus() == null) {
            product.setStatus(originalStatus);
        }
        // Chỉ cho phép admin thay đổi status
        if (request.getStatus() != null && isAdmin) {
            product.setStatus(request.getStatus());
        }
        product.setUpdatedAt(LocalDateTime.now());

        // TÃ­nh láº¡i giÃ¡ náº¿u unitPrice, tax, hoáº·c discountValue Ä‘Æ°á»£c cáº­p nháº­t
        if (request.getUnitPrice() != null || request.getTax() != null || request.getDiscountValue() != null) {
            Double unitPrice = request.getUnitPrice() != null ? request.getUnitPrice() : product.getUnitPrice();
            Double tax = request.getTax() != null ? request.getTax() : product.getTax();
            Double discountValue = request.getDiscountValue() != null ? request.getDiscountValue() : product.getDiscountValue();
            
            if (unitPrice != null && unitPrice >= 0) {
                product.setUnitPrice(unitPrice);
                product.setPrice(computeFinalPrice(unitPrice, tax, discountValue));
            }
        }

        // Cáº­p nháº­t category náº¿u cÃ³
        if (request.getCategoryId() != null && !request.getCategoryId().isEmpty()) {
            Category category = categoryRepository
                    .findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));
            product.setCategory(category);
        }

        // Cáº­p nháº­t promotion náº¿u cÃ³
        if (request.getPromotionId() != null) {
            if (request.getPromotionId().isEmpty()) {
                // Náº¿u promotionId lÃ  chuá»—i rá»—ng, xÃ³a promotion
                product.setPromotion(null);
            } else {
                Promotion promotion = promotionRepository
                        .findById(request.getPromotionId())
                        .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));
                product.setPromotion(promotion);
            }
        }

        // Cáº­p nháº­t inventory náº¿u cÃ³
        if (request.getStockQuantity() != null) {
            if (product.getInventory() == null) {
                Inventory inventory = Inventory.builder()
                        .stockQuantity(request.getStockQuantity())
                        .lastUpdated(java.time.LocalDate.now())
                        .product(product)
                        .build();
                product.setInventory(inventory);
            } else {
                product.getInventory().setStockQuantity(request.getStockQuantity());
                product.getInventory().setLastUpdated(java.time.LocalDate.now());
            }
        }

        // Cáº­p nháº­t media náº¿u cÃ³ - chá»‰ xÃ³a media khÃ´ng cÃ²n trong danh sÃ¡ch má»›i, thÃªm media má»›i
        if (request.getImageUrls() != null || request.getVideoUrls() != null) {
            updateMediaList(product, request);
        }

        Product savedProduct = productRepository.save(product);
        log.info("Product updated: {} by user: {}", productId, user.getEmail());
        return productMapper.toResponse(savedProduct);
    }

    // ========== DELETE OPERATIONS ==========
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteProduct(String productId) {
        var context = SecurityContextHolder.getContext();
        String userEmail = context.getAuthentication().getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Product product = productRepository
                .findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        // 1. XÃ³a product khá»i táº¥t cáº£ Promotion.productApply (báº£ng promotion_products)
        List<Promotion> promotionsWithProduct = promotionRepository.findByProductId(productId);
        for (Promotion promotion : promotionsWithProduct) {
            promotion.getProductApply().remove(product);
            promotionRepository.save(promotion);
        }

        // 2. XÃ³a product khá»i táº¥t cáº£ Voucher.productApply (báº£ng voucher_products)
        // TÃ¬m táº¥t cáº£ vouchers cÃ³ product nÃ y
        List<Voucher> vouchersWithProduct = voucherRepository.findByProductId(productId);
        for (Voucher voucher : vouchersWithProduct) {
            voucher.getProductApply().remove(product);
            voucherRepository.save(voucher);
        }

        // 3. Xóa tất cả CartItem liên quan đến product này
        List<CartItem> cartItems = cartItemRepository.findByProductId(productId);
        if (!cartItems.isEmpty()) {
            cartItemRepository.deleteAll(cartItems);
            log.info("Deleted {} cart items for product: {}", cartItems.size(), productId);
        }

        // 4. Set product.promotion = null (náº¿u cÃ³ promotion trá»±c tiáº¿p)
        if (product.getPromotion() != null) {
            product.setPromotion(null);
            productRepository.save(product);
        }

        // 5. XÃ³a file media váº­t lÃ½ trong thÆ° má»¥c product_media (náº¿u cÃ³)
        deleteMediaFilesIfExists(product);

        // 6. XÃ³a product
        productRepository.delete(product);
        log.info("Product deleted: {} by user: {}", productId, user.getEmail());
    }

    // ========== READ OPERATIONS ==========
    public ProductResponse getProductById(String productId) {
        Product product = productRepository
                .findByIdWithRelations(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));
        
        // TÃ¬m promotion active cho sáº£n pháº©m nÃ y
        Promotion activePromotion = findActivePromotionForProduct(product);
        
        // Náº¿u cÃ³ promotion active, set vÃ o product
        if (activePromotion != null) {
            product.setPromotion(activePromotion);
        } else {
            // Náº¿u khÃ´ng cÃ³ promotion active, set null
            product.setPromotion(null);
        }
        
        return productMapper.toResponse(product);
    }

    // TÃ¬m promotion Ä‘ang active cho sáº£n pháº©m (theo product trá»±c tiáº¿p hoáº·c theo category)
    private Promotion findActivePromotionForProduct(Product product) {
        LocalDate today = LocalDate.now();
        List<Promotion> activePromotions = new ArrayList<>();
        
        // 1. Kiá»ƒm tra promotion trá»±c tiáº¿p cá»§a product
        if (product.getPromotion() != null) {
            Promotion directPromo = product.getPromotion();
            if (isPromotionActive(directPromo, today)) {
                activePromotions.add(directPromo);
            }
        }
        
        // 2. TÃ¬m promotion active theo product ID (tá»« promotion_products table)
        if (product.getId() != null) {
            List<Promotion> productPromotions = promotionRepository.findActiveByProductId(product.getId(), today);
            activePromotions.addAll(productPromotions);
        }
        
        // 3. TÃ¬m promotion active theo category
        if (product.getCategory() != null && product.getCategory().getId() != null) {
            List<Promotion> categoryPromotions = promotionRepository.findActiveByCategoryId(product.getCategory().getId(), today);
            activePromotions.addAll(categoryPromotions);
        }
        
        // Loáº¡i bá» trÃ¹ng láº·p vÃ  láº¥y promotion cÃ³ startDate sá»›m nháº¥t (Æ°u tiÃªn promotion báº¯t Ä‘áº§u sá»›m hÆ¡n)
        return activePromotions.stream()
                .distinct()
                .filter(p -> isPromotionActive(p, today))
                .min(Comparator.comparing(Promotion::getStartDate, 
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
    }

    // Kiá»ƒm tra promotion cÃ³ Ä‘ang active khÃ´ng
    private boolean isPromotionActive(Promotion promotion, LocalDate today) {
        if (promotion == null) return false;
        
        // Pháº£i lÃ  APPROVED vÃ  isActive = true
        if (promotion.getStatus() != PromotionStatus.APPROVED) {
            return false;
        }
        if (!promotion.getIsActive()) {
            return false;
        }
        
        // Kiá»ƒm tra thá»i gian: startDate <= today <= expiryDate
        if (promotion.getStartDate() != null && promotion.getStartDate().isAfter(today)) {
            return false; // ChÆ°a Ä‘áº¿n ngÃ y báº¯t Ä‘áº§u
        }
        if (promotion.getExpiryDate() != null && promotion.getExpiryDate().isBefore(today)) {
            return false; // ÄÃ£ háº¿t háº¡n
        }
        
        return true;
    }

    public List<ProductResponse> getAllProducts() {
        List<Product> products = productRepository.findAll();
        return products.stream().map(productMapper::toResponse).toList();
    }

    public List<ProductResponse> getActiveProducts() {
        List<Product> products = productRepository.findByStatus(ProductStatus.APPROVED);
        return products.stream().map(productMapper::toResponse).toList();
    }

    public List<ProductResponse> getProductsByCategory(String categoryId) {
        List<Product> products = productRepository.findByCategoryId(categoryId);
        return products.stream()
                .filter(p -> p.getStatus() == ProductStatus.APPROVED)
                .map(productMapper::toResponse)
                .toList();
    }

    public List<ProductResponse> searchProducts(String keyword) {
        List<Product> products = productRepository.findByKeyword(keyword);
        return products.stream()
                .filter(p -> p.getStatus() == ProductStatus.APPROVED)
                .map(productMapper::toResponse)
                .toList();
    }

    public List<ProductResponse> getProductsByPriceRange(Double minPrice, Double maxPrice) {
        List<Product> products = productRepository.findByPriceRange(minPrice, maxPrice);
        return products.stream()
                .filter(p -> p.getStatus() == ProductStatus.APPROVED)
                .map(productMapper::toResponse)
                .toList();
    }

    public List<ProductResponse> getMyProducts() {
        var context = SecurityContextHolder.getContext();
        String userEmail = context.getAuthentication().getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<Product> products = productRepository.findBySubmittedBy(user);
        // Fetch inventory để đảm bảo stockQuantity được load
        products.forEach(product -> {
            if (product.getInventory() != null) {
                product.getInventory().getStockQuantity(); // Trigger lazy loading
            }
        });
        return products.stream().map(productMapper::toResponse).toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<ProductResponse> getPendingProducts() {
        List<Product> products = productRepository.findByStatus(ProductStatus.PENDING);
        return products.stream().map(productMapper::toResponse).toList();
    }

    // ========== APPROVAL OPERATIONS ==========

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse approveProduct(ApproveProductRequest request) {
        var context = SecurityContextHolder.getContext();
        String adminEmail = context.getAuthentication().getName();
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Product product = productRepository
                .findById(request.getProductId())
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        // Xá»­ lÃ½ approve hoáº·c reject
        if ("APPROVE".equals(request.getAction())) {
            product.setStatus(ProductStatus.APPROVED);
            product.setApprovedBy(admin);
            product.setApprovedAt(LocalDateTime.now());
            product.setRejectionReason(null);
            product.setUpdatedAt(LocalDateTime.now());
            log.info("Product approved: {} by admin: {}", product.getId(), adminEmail);
        } else if ("REJECT".equals(request.getAction())) {
            product.setStatus(ProductStatus.REJECTED);
            // KhÃ´ng thiáº¿t láº­p thá»i gian duyá»‡t khi tá»« chá»‘i
            product.setApprovedBy(null);
            product.setApprovedAt(null);
            product.setRejectionReason(request.getReason());
            product.setUpdatedAt(LocalDateTime.now());
            log.info("Product rejected: {} by admin: {}", product.getId(), adminEmail);
        }

        Product savedProduct = productRepository.save(product);
        return productMapper.toResponse(savedProduct);
    }

    // ========== MEDIA OPERATIONS ==========
    @Transactional
    public ProductResponse setDefaultMedia(String productId, String mediaUrl) {
        var context = SecurityContextHolder.getContext();
        String userEmail = context.getAuthentication().getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Product product = productRepository
                .findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        boolean isAdmin = context.getAuthentication().getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !product.getSubmittedBy().getId().equals(user.getId())) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        var mediaOpt = productMediaRepository.findByProductIdAndMediaUrl(productId, mediaUrl);
        if (mediaOpt.isEmpty()) {
            throw new AppException(ErrorCode.PRODUCT_NOT_EXISTED);
        }
        var media = mediaOpt.get();

        // Reorder displayOrder so that selected media is first (0) and others shift down
        List<ProductMedia> medias = productMediaRepository.findByProductIdOrderByDisplayOrderAsc(productId);
        int order = 1; // start from 1 for non-default
        for (ProductMedia m : medias) {
            if (m.getId().equals(media.getId())) {
                m.setDisplayOrder(0);
                m.setDefault(true);
            } else {
                m.setDisplayOrder(order++);
                m.setDefault(false);
            }
            productMediaRepository.save(m);
        }

        // Update product defaultMedia reference
        product.setDefaultMedia(media);
        Product saved = productRepository.save(product);
        return productMapper.toResponse(saved);
    }

    // ========== PRIVATE HELPER METHODS ==========
    private Double computeFinalPrice(Double unitPrice, Double taxNullable, Double discountNullable) {
        double tax = (taxNullable != null && taxNullable >= 0) ? taxNullable : 0.0;
        double discount = (discountNullable != null && discountNullable >= 0) ? discountNullable : 0.0;
        double finalPrice = unitPrice * (1 + tax) - discount;
        return Math.max(0, finalPrice); // Äáº£m báº£o giÃ¡ khÃ´ng Ã¢m
    }

    private void attachMediaFromRequest(Product product, ProductCreationRequest request) {
        List<ProductMedia> mediaEntities = new ArrayList<>();
        ProductMedia defaultMedia = null;
        int displayOrder = 0;

        // Xá»­ lÃ½ áº£nh
        if (request.getImageUrls() != null) {
            for (String url : request.getImageUrls()) {
                if (url == null || url.isBlank()) continue;
                ProductMedia media = ProductMedia.builder()
                        .mediaUrl(url)
                        .mediaType("IMAGE")
                        .isDefault(url.equals(request.getDefaultMediaUrl()))
                        .displayOrder(displayOrder++)
                        .product(product)
                        .build();
                if (media.isDefault()) defaultMedia = media;
                mediaEntities.add(media);
            }
        }

        // Xá»­ lÃ½ video
        if (request.getVideoUrls() != null) {
            for (String url : request.getVideoUrls()) {
                if (url == null || url.isBlank()) continue;
                ProductMedia media = ProductMedia.builder()
                        .mediaUrl(url)
                        .mediaType("VIDEO")
                        .isDefault(url.equals(request.getDefaultMediaUrl()))
                        .displayOrder(displayOrder++)
                        .product(product)
                        .build();
                if (media.isDefault()) defaultMedia = media;
                mediaEntities.add(media);
            }
        }

        // Gáº¯n media vÃ o product
        if (!mediaEntities.isEmpty()) {
            product.setMediaList(mediaEntities);
            // Náº¿u khÃ´ng cÃ³ media nÃ o Ä‘Æ°á»£c Ä‘Ã¡nh dáº¥u lÃ  default, chá»n media Ä‘áº§u tiÃªn
            if (defaultMedia == null) {
                defaultMedia = mediaEntities.get(0);
                defaultMedia.setDefault(true);
            }
            product.setDefaultMedia(defaultMedia);
        }
    }

    private void updateMediaList(Product product, ProductUpdateRequest request) {
        // Lấy danh sách URL từ request
        List<String> requestedUrls = new ArrayList<>();
        if (request.getImageUrls() != null) {
            requestedUrls.addAll(request.getImageUrls());
        }
        if (request.getVideoUrls() != null) {
            requestedUrls.addAll(request.getVideoUrls());
        }

        // Đảm bảo collection tồn tại
        if (product.getMediaList() == null) {
            product.setMediaList(new ArrayList<>());
        }

        // Tạo map để tra cứu media hiện tại theo URL (trước khi remove)
        java.util.Map<String, ProductMedia> existingMediaMap = new java.util.HashMap<>();
        for (ProductMedia media : product.getMediaList()) {
            if (media.getMediaUrl() != null) {
                existingMediaMap.put(media.getMediaUrl(), media);
            }
        }

        // Xóa những media không còn trong danh sách mới và xóa file vật lý
        List<ProductMedia> mediaToRemove = new ArrayList<>();
        for (ProductMedia existingMedia : product.getMediaList()) {
            if (!requestedUrls.contains(existingMedia.getMediaUrl())) {
                mediaToRemove.add(existingMedia);
                // Xóa file vật lý
                deletePhysicalFileByUrl(existingMedia.getMediaUrl());
                // Xóa khỏi map để tránh sử dụng media đã bị remove
                existingMediaMap.remove(existingMedia.getMediaUrl());
            }
        }
        // Remove từ collection (orphanRemoval sẽ tự động xóa khỏi database)
        product.getMediaList().removeAll(mediaToRemove);

        // Thêm media mới và cập nhật displayOrder, isDefault cho tất cả media
        int displayOrder = 0;
        ProductMedia defaultMedia = null;
        String defaultMediaUrl = request.getDefaultMediaUrl();

        // Xử lý imageUrls
        if (request.getImageUrls() != null) {
            for (String url : request.getImageUrls()) {
                if (url == null || url.isBlank()) continue;
                
                ProductMedia media = existingMediaMap.get(url);
                if (media == null) {
                    // Media mới - tạo mới
                    media = ProductMedia.builder()
                            .mediaUrl(url)
                            .mediaType("IMAGE")
                            .isDefault(url.equals(defaultMediaUrl))
                            .displayOrder(displayOrder++)
                            .product(product)
                            .build();
                    product.getMediaList().add(media);
                } else {
                    // Media đã tồn tại - chỉ cập nhật displayOrder và isDefault
                    media.setDisplayOrder(displayOrder++);
                    media.setDefault(url.equals(defaultMediaUrl));
                }
                
                if (media.isDefault()) {
                    defaultMedia = media;
                }
            }
        }

        // Xử lý videoUrls
        if (request.getVideoUrls() != null) {
            for (String url : request.getVideoUrls()) {
                if (url == null || url.isBlank()) continue;
                
                ProductMedia media = existingMediaMap.get(url);
                if (media == null) {
                    // Media mới - tạo mới
                    media = ProductMedia.builder()
                            .mediaUrl(url)
                            .mediaType("VIDEO")
                            .isDefault(url.equals(defaultMediaUrl))
                            .displayOrder(displayOrder++)
                            .product(product)
                            .build();
                    product.getMediaList().add(media);
                } else {
                    // Media đã tồn tại - chỉ cập nhật displayOrder và isDefault
                    media.setDisplayOrder(displayOrder++);
                    media.setDefault(url.equals(defaultMediaUrl));
                }
                
                if (media.isDefault()) {
                    defaultMedia = media;
                }
            }
        }

        // Đặt default media
        if (defaultMedia != null) {
            product.setDefaultMedia(defaultMedia);
        } else if (!product.getMediaList().isEmpty()) {
            // Nếu không có media nào được đánh dấu là default, chọn media đầu tiên
            ProductMedia firstMedia = product.getMediaList().get(0);
            firstMedia.setDefault(true);
            product.setDefaultMedia(firstMedia);
        } else {
            product.setDefaultMedia(null);
        }
    }

    private void attachMediaFromUpdateRequest(Product product, ProductUpdateRequest request) {
        List<ProductMedia> mediaEntities = new ArrayList<>();
        ProductMedia defaultMedia = null;
        int displayOrder = 0;

        // Xá»­ lÃ½ áº£nh
        if (request.getImageUrls() != null) {
            for (String url : request.getImageUrls()) {
                if (url == null || url.isBlank()) continue;
                ProductMedia media = ProductMedia.builder()
                        .mediaUrl(url)
                        .mediaType("IMAGE")
                        .isDefault(url.equals(request.getDefaultMediaUrl()))
                        .displayOrder(displayOrder++)
                        .product(product)
                        .build();
                if (media.isDefault()) defaultMedia = media;
                mediaEntities.add(media);
            }
        }

        // Xá»­ lÃ½ video
        if (request.getVideoUrls() != null) {
            for (String url : request.getVideoUrls()) {
                if (url == null || url.isBlank()) continue;
                ProductMedia media = ProductMedia.builder()
                        .mediaUrl(url)
                        .mediaType("VIDEO")
                        .isDefault(url.equals(request.getDefaultMediaUrl()))
                        .displayOrder(displayOrder++)
                        .product(product)
                        .build();
                if (media.isDefault()) defaultMedia = media;
                mediaEntities.add(media);
            }
        }

        // Gáº¯n media vÃ o product
        if (!mediaEntities.isEmpty()) {
            product.setMediaList(mediaEntities);
            // Náº¿u khÃ´ng cÃ³ media nÃ o Ä‘Æ°á»£c Ä‘Ã¡nh dáº¥u lÃ  default, chá»n media Ä‘áº§u tiÃªn
            if (defaultMedia == null) {
                defaultMedia = mediaEntities.get(0);
                defaultMedia.setDefault(true);
            }
            product.setDefaultMedia(defaultMedia);
        }
    }

    private void deleteMediaFilesIfExists(Product product) {
        try {
            if (product.getMediaList() != null) {
                for (ProductMedia media : product.getMediaList()) {
                    deletePhysicalFileByUrl(media.getMediaUrl());
                }
            }
            if (product.getDefaultMedia() != null) {
                deletePhysicalFileByUrl(product.getDefaultMedia().getMediaUrl());
            }
        } catch (Exception e) {
            log.warn("Failed to delete media files for product {}: {}", product.getId(), e.getMessage());
        }
    }

    private void deletePhysicalFileByUrl(String url) {
        if (url == null || url.isBlank()) return;
        try {
            String filename = null;
            try {
                java.net.URI uri = java.net.URI.create(url);
                String path = uri.getPath();
                if (path != null && !path.isBlank()) {
                    int lastSlash = path.lastIndexOf('/');
                    if (lastSlash >= 0 && lastSlash < path.length() - 1) {
                        filename = path.substring(lastSlash + 1);
                    }
                }
            } catch (IllegalArgumentException ignored) { }

            if (filename == null) {
                String path = url;
                if (path.startsWith("/")) path = path.substring(1);
                if (path.startsWith("uploads/product_media/")) {
                    filename = path.substring("uploads/product_media/".length());
                } else if (path.startsWith("product_media/")) {
                    filename = path.substring("product_media/".length());
                }
            }

            if (filename == null && !url.contains("/")) {
                filename = url;
            }

            if (filename == null || filename.isBlank()) return;

            // XÃ¡c Ä‘á»‹nh thÆ° má»¥c dá»±a trÃªn URL (máº·c Ä‘á»‹nh lÃ  uploads/product_media)
            Path targetDir = Paths.get("uploads", "product_media");
            Path filePath = targetDir.resolve(filename);
            boolean deleted = Files.deleteIfExists(filePath);

            if (!deleted) {
                Path legacyDir = Paths.get("product_media");
                Path legacyPath = legacyDir.resolve(filename);
                deleted = Files.deleteIfExists(legacyPath);
                if (deleted) {
                    log.info("Deleted media file from legacy folder: {}", legacyPath.toAbsolutePath());
                }
            } else {
                log.info("Deleted media file: {}", filePath.toAbsolutePath());
            }
        } catch (Exception e) {
            log.warn("Could not delete media file for url {}: {}", url, e.getMessage());
        }
    }
}
