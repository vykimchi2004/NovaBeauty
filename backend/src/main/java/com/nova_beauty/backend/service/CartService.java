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

import java.time.LocalDate;

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
    @PreAuthorize("hasAuthority('CUSTOMER')")
    public Cart getOrCreateCartForCurrentCustomer() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        return cartRepository
                .findByUserId(user.getId())
                .orElseGet(() -> cartRepository.save(Cart.builder().user(user).build()));
    }

    @Transactional
    @PreAuthorize("hasAuthority('CUSTOMER')")
    public Cart addItem(String productId, int quantity) {
        if (quantity <= 0) {
            throw new AppException(ErrorCode.OUT_OF_STOCK);
        }

        Cart cart = getOrCreateCartForCurrentCustomer();

        Product product = productRepository
                .findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        CartItem cartItem = cartItemRepository
                .findByCartIdAndProductId(cart.getId(), productId)
                .orElse(CartItem.builder()
                        .cart(cart)
                        .product(product)
                        .unitPrice(calculateUnitPrice(product))
                        .quantity(0)
                        .build());

        cartItem.setQuantity(cartItem.getQuantity() + quantity);
        double finalPrice = cartItem.getQuantity() * cartItem.getUnitPrice();
        cartItem.setFinalPrice(finalPrice);

        cartItemRepository.save(cartItem);
        recalcCartTotals(cart);
        return cart;
    }

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
        double subtotal = cart.getCartItems() == null
                ? 0.0
                : cart.getCartItems().stream()
                        .mapToDouble(CartItem::getFinalPrice)
                        .sum();
        cart.setSubtotal(subtotal);
        double voucherDiscount = cart.getVoucherDiscount();
        double total = Math.max(0.0, subtotal - (voucherDiscount == 0 ? 0.0 : voucherDiscount));
        cart.setTotalAmount(total);
        cartRepository.save(cart);
    }

    @Transactional
    @PreAuthorize("hasAuthority('CUSTOMER')")
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
        
        // Láº¥y current user
        User currentUser = cart.getUser();
        if (currentUser == null) {
            String userEmail = SecurityContextHolder.getContext().getAuthentication().getName();
            currentUser = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        }
        
        // LÆ°u userId vÃ o biáº¿n final Ä‘á»ƒ sá»­ dá»¥ng trong lambda
        final String userId = currentUser.getId();
        
        // Kiá»ƒm tra usagePerUser: sá»‘ láº§n user Ä‘Ã£ dÃ¹ng voucher nÃ y
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
        
        // TÃ­nh tá»•ng giÃ¡ trá»‹ Ä‘Æ¡n hÃ ng cÃ³ thá»ƒ Ã¡p dá»¥ng voucher
        double applicableSubtotal = calculateApplicableSubtotal(cart, voucher);
        
        // Náº¿u giÃ¡ trá»‹ Ä‘Æ¡n hÃ ng cÃ³ thá»ƒ Ã¡p dá»¥ng voucher nhá» hÆ¡n giÃ¡ trá»‹ tá»‘i thiá»ƒu cá»§a voucher, throw error
        if (voucher.getMinOrderValue() != null && voucher.getMinOrderValue() > 0 
                && applicableSubtotal < voucher.getMinOrderValue()) {
            throw new AppException(ErrorCode.INVALID_VOUCHER_MINIUM);
        }

        // TÃ­nh giÃ¡ trá»‹ giáº£m giÃ¡ dá»±a trÃªn loáº¡i giáº£m giÃ¡ cá»§a voucher
        double discountValue = voucher.getDiscountValue();
        double discount;
        if (voucher.getDiscountValueType() == DiscountValueType.PERCENTAGE) {
            discount = applicableSubtotal * (discountValue / 100.0);
        } else {
            discount = discountValue;
        }
        
        // Náº¿u giÃ¡ trá»‹ giáº£m giÃ¡ vÆ°á»£t quÃ¡ giÃ¡ trá»‹ giáº£m giÃ¡ tá»‘i Ä‘a cá»§a voucher, set giÃ¡ trá»‹ giáº£m giÃ¡ tá»‘i Ä‘a cá»§a voucher
        if (voucher.getMaxDiscountValue() != null && voucher.getMaxDiscountValue() > 0) {
            discount = Math.min(discount, voucher.getMaxDiscountValue());
        }
        
        // Náº¿u giÃ¡ trá»‹ giáº£m giÃ¡ vÆ°á»£t quÃ¡ giÃ¡ trá»‹ Ä‘Æ¡n hÃ ng cÃ³ thá»ƒ Ã¡p dá»¥ng voucher, set giÃ¡ trá»‹ giáº£m giÃ¡ tá»‘i Ä‘a cá»§a voucher
        discount = Math.min(discount, applicableSubtotal);
        
        // Láº¥y tá»•ng giÃ¡ trá»‹ Ä‘Æ¡n hÃ ng Ä‘á»ƒ tÃ­nh toÃ¡n cuá»‘i cÃ¹ng
        double fullSubtotal = cart.getSubtotal();

        cart.setAppliedVoucherCode(voucher.getCode());
        cart.setVoucherDiscount(discount);
        cart.setTotalAmount(Math.max(0.0, fullSubtotal - discount));
        return cartRepository.save(cart);
    }

    // TÃ­nh tá»•ng giÃ¡ trá»‹ Ä‘Æ¡n hÃ ng cÃ³ thá»ƒ Ã¡p dá»¥ng voucher dá»±a trÃªn pháº¡m vi Ã¡p dá»¥ng cá»§a voucher
    private double calculateApplicableSubtotal(Cart cart, Voucher voucher) {
        if (voucher.getApplyScope() == null || voucher.getApplyScope() == DiscountApplyScope.ORDER) {
            // Ãp dá»¥ng cho toÃ n bá»™ Ä‘Æ¡n hÃ ng
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
                        // Náº¿u sáº£n pháº©m cÃ³ náº±m trong danh sÃ¡ch sáº£n pháº©m cá»§a voucher, return true
                        return voucher.getProductApply() != null
                                && voucher.getProductApply().stream()
                                        .anyMatch(vp -> vp.getId().equals(product.getId()));
                    } else if (scope == DiscountApplyScope.CATEGORY) {
                        // Náº¿u danh má»¥c sáº£n pháº©m cÃ³ náº±m trong danh sÃ¡ch danh má»¥c cá»§a voucher, return true
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
}
