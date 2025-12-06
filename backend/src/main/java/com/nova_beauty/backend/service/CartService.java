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
                    .unitPrice(calculateUnitPrice(product))
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


     //Tính đơn giá sản phẩm cho giỏ hàng.


    private double calculateUnitPrice(Product product) {
        double basePrice = product.getPrice();
        double discounted = basePrice;
        // Apply active promotions by product
        var today = java.time.LocalDate.now();
        var promosByProduct = promotionRepository.findActiveByProductId(product.getId(), today);
        var promosByCategory = product.getCategory() == null
                ? java.util.List.<com.nova_beauty.backend.entity.Promotion>of()
                : promotionRepository.findActiveByCategoryId(
                        product.getCategory().getId(), today);

        for (var p : java.util.stream.Stream.concat(promosByProduct.stream(), promosByCategory.stream())
                .toList()) {
            Double dv = p.getDiscountValue();
            if (dv == null || dv <= 0) continue;
            // Heuristic: <=1 => percent, else amount
            double candidate = dv <= 1.0 ? basePrice * (1.0 - dv) : basePrice - dv;
            if (p.getMaxDiscountValue() != null && p.getMaxDiscountValue() > 0 && dv > 1.0) {
                candidate = Math.max(basePrice - p.getMaxDiscountValue(), candidate);
            }
            discounted = Math.min(discounted, Math.max(candidate, 0));
        }

        // Apply tax if provided (assume tax is percentage, e.g., 0.1 for 10%) to derive pre-tax unit price? Keep
        // unitPrice pre-tax
        return discounted;
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
        cartItemIds.forEach(id -> cartItemRepository.findById(id).ifPresent(item -> {
            if (item.getCart() != null && item.getCart().getId().equals(cart.getId())) {
                cartItemRepository.delete(item);
            }
        }));
        recalcCartTotals(cart);
    }
}
