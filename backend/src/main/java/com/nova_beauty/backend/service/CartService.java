package com.nova_beauty.backend.service;

import org.springframework.security.access.prepost.PreAuthorize;
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


     //Tính đơn giá sản phẩm cho giỏ hàng.


    private double calculateUnitPrice(Product product) {
        double price = product.getPrice() != null ? product.getPrice() : 0.0;
        return Math.round(price);
    }

    private void recalcCartTotals(Cart cart) {
        // Đồng bộ lại đơn giá và thành tiền của từng cartItem
        if (cart.getCartItems() != null && !cart.getCartItems().isEmpty()) {
            cart.getCartItems().forEach(item -> {
                Product product = item.getProduct();
                if (product != null) {
                    // Tính lại đơn giá dựa trên cấu hình khuyến mãi hiện tại
                    double unitPrice = calculateUnitPrice(product);
                    item.setUnitPrice(unitPrice);
                    // Thành tiền = đơn giá * số lượng
                    double finalPrice = unitPrice * item.getQuantity();
                    item.setFinalPrice(finalPrice);
                    cartItemRepository.save(item);
                }
            });
        }

        // Tính lại subtotal từ các cartItem (nếu chưa có item thì subtotal = 0)
        double subtotal = cart.getCartItems() == null
                ? 0.0
                : cart.getCartItems().stream()
                        .mapToDouble(CartItem::getFinalPrice)
                        .sum();
        // Làm tròn subtotal về đơn vị đồng
        subtotal = Math.round(subtotal);
        cart.setSubtotal(subtotal);

        // voucherDiscount có thể null với giỏ hàng mới => mặc định 0
        Double rawVoucherDiscount = cart.getVoucherDiscount();
        double voucherDiscount = rawVoucherDiscount == null ? 0.0 : rawVoucherDiscount;
        // Làm tròn tiền giảm giá về đơn vị đồng
        voucherDiscount = Math.round(voucherDiscount);
        cart.setVoucherDiscount(voucherDiscount);

        double total = Math.max(0.0, subtotal - voucherDiscount);
        // Làm tròn tổng tiền về đơn vị đồng
        total = Math.round(total);
        cart.setTotalAmount(total);

        // Lưu lại cart với giá trị subtotal / totalAmount mới
        cartRepository.save(cart);
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
        
        // Nếu giá trị giảm giá vượt quá giá trị đơn hàng có thể áp dụng voucher, set giá trị giảm giá tối đa của voucher
        discount = Math.min(discount, applicableSubtotal);
        
        // Lấy tổng giá trị đơn hàng để tính toán cuối cùng
        double fullSubtotal = cart.getSubtotal();

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
        if (quantity <= 0) {
            throw new AppException(ErrorCode.OUT_OF_STOCK);
        }

        Cart cart = getOrCreateCartForCurrentCustomer();
        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_ITEM_NOT_EXISTED));

        // Kiểm tra cartItem thuộc về cart của user hiện tại
        if (!cartItem.getCart().getId().equals(cart.getId())) {
            throw new AppException(ErrorCode.CART_ITEM_NOT_EXISTED);
        }

        cartItem.setQuantity(quantity);
        double finalPrice = cartItem.getQuantity() * cartItem.getUnitPrice();
        cartItem.setFinalPrice(finalPrice);

        cartItemRepository.save(cartItem);
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
