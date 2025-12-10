package com.nova_beauty.backend.service;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.entity.*;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.repository.CartItemRepository;
import com.nova_beauty.backend.repository.CartRepository;
import com.nova_beauty.backend.repository.ProductRepository;
import com.nova_beauty.backend.repository.PromotionRepository;
import com.nova_beauty.backend.repository.UserRepository;
import com.nova_beauty.backend.enums.DiscountValueType;
import com.nova_beauty.backend.enums.DiscountApplyScope;
import com.nova_beauty.backend.repository.VoucherRepository;
import com.nova_beauty.backend.repository.OrderRepository;
import com.nova_beauty.backend.util.SecurityUtil;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Iterator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CartService {

    CartRepository cartRepository;
    CartItemRepository cartItemRepository;
    UserRepository userRepository;
    ProductRepository productRepository;
    PromotionRepository promotionRepository;
    VoucherRepository voucherRepository;
    OrderRepository orderRepository;
    ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public Cart getOrCreateCartForCurrentCustomer() {
        // Authentication name đang là email (subject của JWT)
        String email = SecurityUtil.getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Lấy cart hiện tại của user (nếu có), nếu không thì tạo mới.
        return cartRepository
                .findByUserId(user.getId())
                .orElseGet(() -> cartRepository.save(Cart.builder().user(user).build()));
    }

    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public Cart getCart() {
        Cart cart = getOrCreateCartForCurrentCustomer();
        // Force load cart items to avoid lazy loading issues
        if (cart.getCartItems() != null) {
            cart.getCartItems().size(); // Trigger lazy loading
        }
        // Recalculate totals to ensure they are up to date
        recalcCartTotals(cart);
        return cart;
    }

    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public Cart addItem(String productId, int quantity, String colorCode) {
        Cart cart = getOrCreateCartForCurrentCustomer();

        Product product = productRepository
                .findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        // Kiểm tra product status - chỉ cho phép thêm sản phẩm đã được duyệt
        if (product.getStatus() != com.nova_beauty.backend.enums.ProductStatus.APPROVED) {
            throw new AppException(ErrorCode.PRODUCT_NOT_EXISTED);
        }

        // Kiểm tra product price - phải có giá và > 0
        if (product.getPrice() == null || product.getPrice() <= 0) {
            throw new AppException(ErrorCode.PRODUCT_NOT_EXISTED);
        }

        // Tìm cartItem theo productId và colorCode (nếu có)
        CartItem cartItem = null;
        String normalizedColorCode = (colorCode != null && !colorCode.trim().isEmpty())
                ? colorCode.trim()
                : null;

        if (normalizedColorCode != null) {
            cartItem = cartItemRepository
                    .findByCartIdAndProductIdAndColorCode(cart.getId(), productId, normalizedColorCode)
                    .orElse(null);
        } else {
            // Nếu không có colorCode, tìm cartItem không có colorCode
            cartItem = cartItemRepository
                    .findByCartIdAndProductId(cart.getId(), productId)
                    .orElse(null);
        }

        // Nếu quantity <= 0 và không có item, không làm gì (cho phép quantity âm để giảm/xóa item đã có)
        if (quantity <= 0 && cartItem == null) {
            return cart;
        }

        // Nếu chưa có item và quantity dương, tạo mới
        if (cartItem == null) {
            cartItem = CartItem.builder()
                    .cart(cart)
                    .product(product)
                    .unitPrice(calculateUnitPrice(product, normalizedColorCode))
                    .quantity(0)
                    .colorCode(normalizedColorCode)
                    .build();
        }

        int newQuantity = cartItem.getQuantity() + quantity;

        // Nếu quantity mới <= 0, xóa item
        if (newQuantity <= 0) {
            cartItemRepository.delete(cartItem);
            // Refresh cart để cập nhật cartItems collection
            cartRepository.flush();
            cart = cartRepository.findById(cart.getId()).orElse(cart);
        } else {
            cartItem.setQuantity(newQuantity);
            double finalPrice = cartItem.getQuantity() * cartItem.getUnitPrice();
            cartItem.setFinalPrice(finalPrice);
            cartItemRepository.save(cartItem);
        }

        recalcCartTotals(cart);
        // Refresh cart một lần nữa để đảm bảo cartItems được cập nhật
        cart = cartRepository.findById(cart.getId()).orElse(cart);
        return cart;
    }


     //Tính đơn giá sản phẩm cho giỏ hàng - giống logic frontend ProductDetail

    private double calculateUnitPrice(Product product, String colorCode) {
        // Nếu có colorCode, tìm giá variant từ manufacturingLocation (giống frontend)
        if (colorCode != null && !colorCode.trim().isEmpty()) {
            Double variantPrice = resolveVariantPrice(product, colorCode.trim());
            if (variantPrice != null && variantPrice > 0) {
                // Variant có giá riêng, tính giá có thuế (giống frontend: variantPrice * (1 + tax))
                Double tax = product.getTax();
                if (tax == null) {
                    tax = 0.08; // Mặc định 8% như frontend
                }
                double priceWithTax = variantPrice * (1.0 + tax);
                return Math.round(priceWithTax); // Làm tròn như frontend
            }
        }
        
        // Nếu không có variant price, dùng giá sản phẩm và áp dụng promotion (giống ProductService)
        // Lấy unitPrice từ product (giá gốc chưa có tax)
        double unitPrice = product.getUnitPrice() != null ? product.getUnitPrice() : 0.0;
        if (unitPrice <= 0) {
            // Nếu không có unitPrice, thử tính từ price (giả sử price đã có tax)
            double price = product.getPrice() != null ? product.getPrice() : 0.0;
            Double tax = product.getTax();
            if (tax == null) tax = 0.08; // Mặc định 8%
            if (price > 0 && tax > 0) {
                unitPrice = price / (1.0 + tax);
            } else {
                unitPrice = price;
            }
        }
        
        // Tính giá có thuế (giống ProductService.applyActivePromotionToProduct)
        Double tax = product.getTax();
        if (tax == null) tax = 0.08; // Mặc định 8%
        double priceWithTax = unitPrice * (1.0 + tax);
        
        // Tìm promotion active (giống ProductService.findActivePromotionForProduct)
        var today = java.time.LocalDate.now();
        com.nova_beauty.backend.entity.Promotion activePromotion = null;
        
        // Kiểm tra promotion trực tiếp của product
        if (product.getPromotion() != null && isPromotionActive(product.getPromotion(), today)) {
            activePromotion = product.getPromotion();
        }
        
        // Nếu chưa có, tìm promotion theo productId
        if (activePromotion == null) {
        var promosByProduct = promotionRepository.findActiveByProductId(product.getId(), today);
            if (!promosByProduct.isEmpty()) {
                activePromotion = promosByProduct.get(0); // Lấy promotion đầu tiên
            }
        }
        
        // Nếu chưa có, tìm promotion theo category
        if (activePromotion == null && product.getCategory() != null) {
            var promosByCategory = promotionRepository.findActiveByCategoryId(
                        product.getCategory().getId(), today);
            if (!promosByCategory.isEmpty()) {
                activePromotion = promosByCategory.get(0); // Lấy promotion đầu tiên
            }
        }
        
        // Tính discount và final price (giống ProductService.calculateDiscountAmount)
        if (activePromotion != null) {
            double discountAmount = calculateDiscountAmount(activePromotion, priceWithTax);
            double finalPrice = Math.max(0, priceWithTax - discountAmount);
            return Math.round(finalPrice);
        } else {
            // Không có promotion, trả về giá có thuế
            return Math.round(priceWithTax);
        }
    }

    /**
     * Tìm giá variant từ manufacturingLocation JSON (giống frontend normalizeVariantRecords)
     * Trả về variant.price nếu tìm thấy, null nếu không có
     */
    private Double resolveVariantPrice(Product product, String colorCode) {
        if (product == null || colorCode == null || colorCode.isBlank()) {
            return null;
        }
        
        String raw = product.getManufacturingLocation();
        if (raw == null || raw.isBlank()) {
            return null;
        }
        
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode variantsNode = extractVariantsNode(root);
            if (variantsNode != null && variantsNode.isArray()) {
                String normalized = colorCode.trim().toLowerCase(Locale.ROOT);
                Iterator<JsonNode> it = variantsNode.elements();
                while (it.hasNext()) {
                    JsonNode node = it.next();
                    String code = textLower(node.get("code"));
                    String name = textLower(node.get("name"));
                    
                    // So khớp code hoặc name (giống frontend)
                    if (normalized.equals(code) || normalized.equals(name)) {
                        // Lấy variant.price (giống frontend: entry.price)
                        if (node.hasNonNull("price")) {
                            double price = node.get("price").asDouble(-1);
                            if (price > 0) {
                                return price;
                            }
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // Nếu parse JSON lỗi, trả về null
        }
        
        return null;
    }

    private JsonNode extractVariantsNode(JsonNode root) {
        if (root == null) return null;
        if (root.isArray()) return root;
        if (root.has("variants")) return root.get("variants");
        if (root.has("colors")) return root.get("colors");
        if (root.has("data")) return root.get("data");
        return null;
    }

    private String textLower(JsonNode node) {
        if (node == null || node.isNull()) return null;
        String s = node.asText();
        return s == null ? null : s.trim().toLowerCase(Locale.ROOT);
    }

    private void recalcCartTotals(Cart cart) {
        // Query lại cartItems từ database để đảm bảo tính toán chính xác
        List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());
        double subtotal = cartItems == null || cartItems.isEmpty()
                ? 0.0
                : cartItems.stream()
                        .mapToDouble(CartItem::getFinalPrice)
                        .sum();
        // Làm tròn subtotal về đơn vị đồng
        subtotal = Math.round(subtotal);
        cart.setSubtotal(subtotal);
        
        // Nếu có voucher đang được áp dụng, tính lại voucher discount dựa trên subtotal mới
        double voucherDiscount = 0.0;
        if (cart.getAppliedVoucherCode() != null && !cart.getAppliedVoucherCode().isEmpty()) {
            voucherDiscount = recalculateVoucherDiscount(cart, subtotal);
            cart.setVoucherDiscount(voucherDiscount);
        } else {
            // Nếu không có voucher, set voucherDiscount về 0
            cart.setVoucherDiscount(0.0);
        }
        
        double total = Math.max(0.0, subtotal - voucherDiscount);
        cart.setTotalAmount(total);
        cartRepository.save(cart);
    }
    
    // Tính lại voucher discount khi số lượng sản phẩm thay đổi
    private double recalculateVoucherDiscount(Cart cart, double subtotal) {
        try {
            // Lấy voucher từ database
            var voucher = voucherRepository.findByCode(cart.getAppliedVoucherCode())
                    .orElse(null);
            
            // Nếu voucher không tồn tại hoặc không active, xóa voucher khỏi cart
            if (voucher == null || !voucher.getIsActive() || voucher.getStatus() != com.nova_beauty.backend.enums.VoucherStatus.APPROVED) {
                cart.setAppliedVoucherCode(null);
                return 0.0;
            }
            
            // Kiểm tra voucher còn hiệu lực không
            LocalDate today = LocalDate.now();
            if ((voucher.getStartDate() != null && today.isBefore(voucher.getStartDate()))
                    || (voucher.getExpiryDate() != null && today.isAfter(voucher.getExpiryDate()))) {
                cart.setAppliedVoucherCode(null);
                return 0.0;
            }
            
            // Refresh cart để đảm bảo cartItems được load
            cart = cartRepository.findById(cart.getId()).orElse(cart);
            // Force load cartItems
            if (cart.getCartItems() != null) {
                cart.getCartItems().size(); // Trigger lazy loading
            }
            
            // Tính tổng giá trị đơn hàng có thể áp dụng voucher
            double applicableSubtotal = calculateApplicableSubtotal(cart, voucher);
            
            // Kiểm tra minOrderValue
            if (voucher.getMinOrderValue() != null && voucher.getMinOrderValue() > 0 
                    && applicableSubtotal < voucher.getMinOrderValue()) {
                // Nếu không đủ điều kiện, xóa voucher khỏi cart
                cart.setAppliedVoucherCode(null);
                return 0.0;
            }
            
            // Tính giá trị giảm giá dựa trên loại giảm giá của voucher
            double discountValue = voucher.getDiscountValue();
            double discount;
            if (voucher.getDiscountValueType() == DiscountValueType.PERCENTAGE) {
                discount = applicableSubtotal * (discountValue / 100.0);
            } else {
                discount = discountValue;
            }
            
            // Áp dụng maxDiscountValue nếu có
            if (voucher.getMaxDiscountValue() != null && voucher.getMaxDiscountValue() > 0) {
                discount = Math.min(discount, voucher.getMaxDiscountValue());
            }
            
            // Giới hạn discount không được vượt quá giá trị đơn hàng
            if (voucher.getApplyScope() == null || voucher.getApplyScope() == DiscountApplyScope.ORDER) {
                discount = Math.min(discount, subtotal);
            } else {
                discount = Math.min(discount, applicableSubtotal);
            }
            
            return discount;
        } catch (Exception e) {
            // Nếu có lỗi, xóa voucher khỏi cart và trả về 0
            cart.setAppliedVoucherCode(null);
            return 0.0;
        }
    }

    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public Cart applyVoucher(String code) {
        Cart cart = getOrCreateCartForCurrentCustomer();
        if (cart.getCartItems() == null || cart.getCartItems().isEmpty()) {
            throw new AppException(ErrorCode.CART_ITEM_NOT_EXISTED);
        }

        var voucher =
                voucherRepository.findByCode(code).orElseThrow(() -> new AppException(ErrorCode.VOUCHER_NOT_EXISTED));

        if (!voucher.getIsActive() || voucher.getStatus() != com.nova_beauty.backend.enums.VoucherStatus.APPROVED) {
            throw new AppException(ErrorCode.VOUCHER_NOT_EXISTED);
        }
        LocalDate today = LocalDate.now();
        if ((voucher.getStartDate() != null && today.isBefore(voucher.getStartDate()))
                || (voucher.getExpiryDate() != null && today.isAfter(voucher.getExpiryDate()))) {
            throw new AppException(ErrorCode.VOUCHER_NOT_EXISTED);
        }
        
        // Lấy current user
        User currentUser = cart.getUser();
        if (currentUser == null) {
            org.springframework.security.core.Authentication authentication = SecurityUtil.getAuthentication();
            currentUser = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        }
        

        final String userId = currentUser.getId();
        

        if (voucher.getUsagePerUser() != null && voucher.getUsagePerUser() > 0) {
            long userUsageCount = orderRepository.findAll().stream()
                    .filter(order -> order.getUser() != null && userId.equals(order.getUser().getId()))
                    .filter(order -> order.getCart() != null && order.getCart().getAppliedVoucherCode() != null)
                    .filter(order -> voucher.getCode().equals(order.getCart().getAppliedVoucherCode()))
                    .count();
            
            if (userUsageCount >= voucher.getUsagePerUser()) {
                throw new AppException(ErrorCode.VOUCHER_USAGE_LIMIT_EXCEEDED);
            }
        }
        
        recalcCartTotals(cart);
        
        // Tính tổng giá trị đơn hàng có thể áp dụng voucher
        double applicableSubtotal = calculateApplicableSubtotal(cart, voucher);
        

        if (voucher.getMinOrderValue() != null && voucher.getMinOrderValue() > 0 
                && applicableSubtotal < voucher.getMinOrderValue()) {
            throw new AppException(ErrorCode.INVALID_VOUCHER_MINIUM);
        }

        // Lấy tổng giá trị đơn hàng để tính toán cuối cùng
        double fullSubtotal = cart.getSubtotal();
        
        // Tính giá trị giảm giá dựa trên loại giảm giá của voucher
        double discountValue = voucher.getDiscountValue();
        double discount;
        if (voucher.getDiscountValueType() == DiscountValueType.PERCENTAGE) {
            discount = applicableSubtotal * (discountValue / 100.0);
        } else {
            discount = discountValue;
        }
        
        // Nếu giá trị giảm giá vượt quá giá trị giảm giá tối đa của voucher, set giá trị giảm giá tối đa của voucher
        if (voucher.getMaxDiscountValue() != null && voucher.getMaxDiscountValue() > 0) {
            discount = Math.min(discount, voucher.getMaxDiscountValue());
        }
        
        // Giới hạn discount không được vượt quá giá trị đơn hàng
        // Nếu voucher áp dụng cho toàn bộ đơn hàng (ORDER), giới hạn bởi fullSubtotal để đảm bảo maxDiscountValue được áp dụng đúng
        // Nếu voucher áp dụng cho sản phẩm/category cụ thể, giới hạn bởi applicableSubtotal
        if (voucher.getApplyScope() == null || voucher.getApplyScope() == DiscountApplyScope.ORDER) {
            // Với voucher áp dụng cho toàn bộ đơn hàng, giới hạn bởi fullSubtotal để đảm bảo maxDiscountValue được áp dụng đúng
            discount = Math.min(discount, fullSubtotal);
        } else {
            // Với voucher áp dụng cho sản phẩm/category cụ thể, giới hạn bởi applicableSubtotal
            discount = Math.min(discount, applicableSubtotal);
        }

        cart.setAppliedVoucherCode(voucher.getCode());
        cart.setVoucherDiscount(discount);
        // Tổng sau voucher cũng làm tròn về đồng
        cart.setTotalAmount((double) Math.round(Math.max(0.0, fullSubtotal - discount)));
        return cartRepository.save(cart);
    }

    // Tính tổng giá trị đơn hàng có thể áp dụng voucher dựa trên phạm vi áp dụng của voucher
    private double calculateApplicableSubtotal(Cart cart, Voucher voucher) {
        if (voucher.getApplyScope() == null || voucher.getApplyScope() == DiscountApplyScope.ORDER) {

            return cart.getSubtotal();
        }

        return cart.getCartItems().stream()
                .filter(item -> {
                    Product product = item.getProduct();
                    if (product == null) {
                        return false;
                    }

                    DiscountApplyScope scope = voucher.getApplyScope();
                    if (scope == DiscountApplyScope.PRODUCT) {
                        // Nếu sản phẩm có nằm trong danh sách sản phẩm của voucher, return true
                        return voucher.getProductApply() != null
                                && voucher.getProductApply().stream()
                                        .anyMatch(vp -> vp.getId().equals(product.getId()));
                    } else if (scope == DiscountApplyScope.CATEGORY) {
                        // Nếu danh mục sản phẩm có nằm trong danh sách danh mục của voucher, return true
                        Category productCategory = product.getCategory();
                        return productCategory != null
                                && voucher.getCategoryApply() != null
                                && voucher.getCategoryApply().stream()
                                        .anyMatch(vc -> vc.getId().equals(productCategory.getId()));
                    }
                    return false;
                })
                .mapToDouble(CartItem::getFinalPrice)
                .sum();
    }

    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public Cart updateCartItemQuantity(String cartItemId, int quantity) {
        Cart cart = getOrCreateCartForCurrentCustomer();
        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_ITEM_NOT_EXISTED));

        // Kiểm tra cartItem thuộc về cart của user hiện tại
        if (!cartItem.getCart().getId().equals(cart.getId())) {
            throw new AppException(ErrorCode.CART_ITEM_NOT_EXISTED);
        }

        // Nếu quantity <= 0, xóa item thay vì throw error
        if (quantity <= 0) {
            cartItemRepository.delete(cartItem);
            cartRepository.flush();
            cart = cartRepository.findById(cart.getId()).orElse(cart);
        } else {
            cartItem.setQuantity(quantity);
            double finalPrice = cartItem.getQuantity() * cartItem.getUnitPrice();
            cartItem.setFinalPrice(finalPrice);
            cartItemRepository.save(cartItem);
        }

        recalcCartTotals(cart);
        return cart;
    }

    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public Cart removeCartItem(String cartItemId) {
        Cart cart = getOrCreateCartForCurrentCustomer();
        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_ITEM_NOT_EXISTED));

        // Kiểm tra cartItem thuộc về cart của user hiện tại
        if (!cartItem.getCart().getId().equals(cart.getId())) {
            throw new AppException(ErrorCode.CART_ITEM_NOT_EXISTED);
        }

        // Xóa cartItem khỏi DB
        cartItemRepository.delete(cartItem);

        // Đồng bộ lại collection cartItems trong entity Cart hiện tại,
        // tránh việc recalcCartTotals() save lại item vừa xóa.
        if (cart.getCartItems() != null && !cart.getCartItems().isEmpty()) {
            cart.getCartItems().removeIf(item -> cartItemId.equals(item.getId()));
        }

        // Tính lại tổng tiền sau khi đã loại bỏ item vừa xóa
        recalcCartTotals(cart);
        return cart;
    }

    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public Cart clearVoucher() {
        Cart cart = getOrCreateCartForCurrentCustomer();
        cart.setAppliedVoucherCode(null);
        cart.setVoucherDiscount(0.0);
        recalcCartTotals(cart);
        return cart;
    }

    @Transactional
    public void clearVoucherForUser(User user) {
        if (user == null || user.getId() == null) {
            return;
        }

        cartRepository.findByUserId(user.getId()).ifPresent(cart -> {
            cart.setAppliedVoucherCode(null);
            cart.setVoucherDiscount(0.0);
            recalcCartTotals(cart);
        });
    }

    @Transactional
    public void removeCartItemsForOrder(User user, java.util.List<String> cartItemIds) {
        if (user == null || cartItemIds == null || cartItemIds.isEmpty()) {
            return;
        }
        Cart cart = cartRepository.findByUserId(user.getId()).orElse(null);
        if (cart == null) {
            return;
        }
        
        // Xóa items khỏi collection trước để tránh lỗi khi recalcCartTotals
        if (cart.getCartItems() != null && !cart.getCartItems().isEmpty()) {
            cart.getCartItems().removeIf(item -> cartItemIds.contains(item.getId()));
        }
        
        // Sau đó mới xóa items khỏi DB
        cartItemIds.forEach(id -> cartItemRepository.findById(id).ifPresent(item -> {
            if (item.getCart() != null && item.getCart().getId().equals(cart.getId())) {
                cartItemRepository.delete(item);
            }
        }));
        
        // Tính lại tổng tiền sau khi đã loại bỏ items
        recalcCartTotals(cart);
    }
}
