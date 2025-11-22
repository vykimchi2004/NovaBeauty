package com.nova_beauty.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.request.CreateOrderRequest;
import com.nova_beauty.backend.dto.request.MomoIpnRequest;
import com.nova_beauty.backend.dto.response.CreateMomoResponse;
import com.nova_beauty.backend.entity.Address;
import com.nova_beauty.backend.entity.Cart;
import com.nova_beauty.backend.entity.CartItem;
import com.nova_beauty.backend.entity.Order;
import com.nova_beauty.backend.entity.OrderItem;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.enums.OrderStatus;
import com.nova_beauty.backend.enums.PaymentMethod;
import com.nova_beauty.backend.enums.PaymentStatus;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.repository.AddressRepository;
import com.nova_beauty.backend.repository.OrderItemRepository;
import com.nova_beauty.backend.repository.OrderRepository;
import com.nova_beauty.backend.repository.ProductRepository;
import com.nova_beauty.backend.repository.UserRepository;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.dto.request.DirectCheckoutRequest;
import com.nova_beauty.backend.util.SecurityUtil;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class OrderService {

    OrderRepository orderRepository;
    OrderItemRepository orderItemRepository;
    AddressRepository addressRepository;
    CartService cartService;
    MomoService momoService;
    BrevoEmailService brevoEmailService;
    ProductRepository productRepository;
    UserRepository userRepository;

    ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Khởi tạo đơn hàng từ giỏ hàng hiện tại. Nếu là COD sẽ hoàn tất ngay.
     * Nếu là MoMo sẽ trả về payUrl để khách thanh toán sau.
     */
    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public CheckoutResult createOrderFromCurrentCart(CreateOrderRequest request) {
        Cart cart = cartService.getCart();
        if (cart.getCartItems() == null || cart.getCartItems().isEmpty()) {
            throw new AppException(ErrorCode.CART_ITEM_NOT_EXISTED);
        }

        List<CartItem> selectedItems = resolveSelectedItems(cart.getCartItems(), request.getCartItemIds());
        PricingSummary pricing = calculatePricing(cart, selectedItems, request.getShippingFee());

        Address shippingAddressEntity = resolveShippingAddress(request, cart.getUser());
        String shippingAddressSnapshot = buildShippingAddressSnapshot(
                shippingAddressEntity,
                request.getShippingAddress(),
                cart.getUser());

        PaymentMethod paymentMethod = resolvePaymentMethod(request.getPaymentMethod());
        PaymentStatus paymentStatus = paymentMethod == PaymentMethod.MOMO ? PaymentStatus.PENDING : PaymentStatus.PAID;

        Order order = Order.builder()
                .user(cart.getUser())
                .code(generateOrderCode())
                .note(request.getNote())
                .shippingAddress(shippingAddressSnapshot)
                .address(shippingAddressEntity)
                .orderDate(LocalDate.now())
                .orderDateTime(LocalDateTime.now())
                .shippingFee(pricing.shippingFee)
                .totalAmount(pricing.orderTotal)
                .status(OrderStatus.CREATED)
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentStatus)
                .paid(paymentMethod != PaymentMethod.MOMO)
                .cartItemIdsSnapshot(pricing.cartItemIdsSnapshot)
                .build();

        Order savedOrder = orderRepository.save(order);
        persistOrderItems(savedOrder, selectedItems);

        if (paymentMethod == PaymentMethod.COD) {
            finalizePaidOrder(savedOrder, pricing.selectedCartItemIds);
            return new CheckoutResult(savedOrder, null);
        }

        CreateMomoResponse momoResponse = momoService.createMomoPayment(
                Math.round(pricing.orderTotal), savedOrder.getCode());
        savedOrder.setPaymentReference(momoResponse.getRequestId());
        orderRepository.save(savedOrder);

        return new CheckoutResult(savedOrder, momoResponse.getPayUrl());
    }

    /**
     * Tạo đơn hàng trực tiếp từ sản phẩm (không qua giỏ hàng).
     * Số lượng mặc định là 1.
     */
    @Transactional
    @PreAuthorize("hasRole('CUSTOMER')")
    public CheckoutResult createOrderDirectly(DirectCheckoutRequest request) {
        // Lấy user hiện tại
        String email = SecurityUtil.getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Lấy product
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        // Số lượng mặc định là 1
        int quantity = request.getQuantity() != null && request.getQuantity() > 0 
                ? request.getQuantity() 
                : 1;

        // Tính giá
        double unitPrice = product.getPrice() != null ? product.getPrice() : 0.0;
        double finalPrice = Math.round(unitPrice * quantity);
        double shippingFee = request.getShippingFee() != null ? Math.round(request.getShippingFee()) : 0.0;
        double orderTotal = Math.round(finalPrice + shippingFee);

        // Resolve shipping address
        Address shippingAddressEntity = resolveShippingAddressForDirectCheckout(request, user);
        String shippingAddressSnapshot = buildShippingAddressSnapshot(
                shippingAddressEntity,
                request.getShippingAddress(),
                user);

        // Payment method
        PaymentMethod paymentMethod = resolvePaymentMethod(request.getPaymentMethod());
        PaymentStatus paymentStatus = paymentMethod == PaymentMethod.MOMO ? PaymentStatus.PENDING : PaymentStatus.PAID;

        // Tạo Order
        Order order = Order.builder()
                .user(user)
                .code(generateOrderCode())
                .note(request.getNote())
                .shippingAddress(shippingAddressSnapshot)
                .address(shippingAddressEntity)
                .orderDate(LocalDate.now())
                .orderDateTime(LocalDateTime.now())
                .shippingFee(shippingFee)
                .totalAmount(orderTotal)
                .status(OrderStatus.CREATED)
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentStatus)
                .paid(paymentMethod != PaymentMethod.MOMO)
                .cartItemIdsSnapshot("[]") // Không có cart items
                .build();

        Order savedOrder = orderRepository.save(order);

        // Tạo OrderItem trực tiếp từ product
        OrderItem orderItem = OrderItem.builder()
                .order(savedOrder)
                .product(product)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .finalPrice(finalPrice)
                .build();
        orderItemRepository.save(orderItem);
        orderItemRepository.flush();
        // Sử dụng ArrayList thay vì List.of() để tránh UnsupportedOperationException
        savedOrder.setItems(new ArrayList<>(List.of(orderItem)));

        // Nếu là COD, finalize ngay
        if (paymentMethod == PaymentMethod.COD) {
            // Không cần xóa cart items vì không có
            // Chỉ cần update status và gửi email
            if (savedOrder.getStatus() == OrderStatus.CREATED) {
                savedOrder.setStatus(OrderStatus.CONFIRMED);
            }
            orderRepository.save(savedOrder);
            sendOrderConfirmationEmail(savedOrder);
            return new CheckoutResult(savedOrder, null);
        }

        // Nếu là MoMo, tạo payment link
        CreateMomoResponse momoResponse = momoService.createMomoPayment(
                Math.round(orderTotal), savedOrder.getCode());
        savedOrder.setPaymentReference(momoResponse.getRequestId());
        orderRepository.save(savedOrder);

        return new CheckoutResult(savedOrder, momoResponse.getPayUrl());
    }

    private Address resolveShippingAddressForDirectCheckout(DirectCheckoutRequest request, User user) {
        if (request.getAddressId() == null || request.getAddressId().isBlank()) {
            return null;
        }
        Address address = addressRepository.findById(request.getAddressId())
                .orElseThrow(() -> new AppException(ErrorCode.ADDRESS_NOT_EXISTED));

        if (address.getUsers() != null) {
            boolean belongsToUser = address.getUsers().stream()
                    .anyMatch(u -> u != null && u.getId().equals(user.getId()));
            if (!belongsToUser) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }
        return address;
    }

    private List<CartItem> resolveSelectedItems(List<CartItem> allItems, List<String> requestedIds) {
        if (allItems == null || allItems.isEmpty()) {
            throw new AppException(ErrorCode.CART_ITEM_NOT_EXISTED);
        }
        if (requestedIds == null || requestedIds.isEmpty()) {
            return allItems;
        }
        Set<String> idSet = requestedIds.stream().collect(Collectors.toSet());
        List<CartItem> selected = allItems.stream()
                .filter(ci -> idSet.contains(ci.getId()))
                .collect(Collectors.toList());
        if (selected.isEmpty()) {
            throw new AppException(ErrorCode.CART_ITEM_NOT_EXISTED);
        }
        return selected;
    }

    private PricingSummary calculatePricing(Cart cart, List<CartItem> selectedItems, Double rawShippingFee) {
        PricingSummary summary = new PricingSummary();

        double shippingFee = rawShippingFee != null ? rawShippingFee : 0.0;
        double selectedSubtotal = selectedItems.stream()
                .mapToDouble(ci -> ci.getFinalPrice() != null ? ci.getFinalPrice() : 0.0)
                .sum();
        Double rawVoucherDiscount = cart.getVoucherDiscount();
        double voucherDiscount = rawVoucherDiscount == null ? 0.0 : rawVoucherDiscount;

        selectedSubtotal = Math.round(selectedSubtotal);
        shippingFee = Math.round(shippingFee);
        voucherDiscount = Math.round(voucherDiscount);

        double rawOrderTotal = selectedSubtotal + shippingFee - voucherDiscount;
        double orderTotal = Math.round(Math.max(0.0, rawOrderTotal));

        summary.shippingFee = shippingFee;
        summary.orderTotal = orderTotal;
        summary.voucherDiscount = voucherDiscount;
        summary.selectedCartItemIds = selectedItems.stream()
                .map(CartItem::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        summary.cartItemIdsSnapshot = serializeCartItemIds(summary.selectedCartItemIds);

        return summary;
    }

    private String serializeCartItemIds(List<String> ids) {
        try {
            return objectMapper.writeValueAsString(ids);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    private void persistOrderItems(Order order, List<CartItem> selectedItems) {
        if (selectedItems == null || selectedItems.isEmpty()) {
            return;
        }
        List<OrderItem> orderItems = selectedItems.stream()
                .map(ci -> OrderItem.builder()
                        .order(order)
                        .product(ci.getProduct())
                        .quantity(ci.getQuantity())
                        .unitPrice(ci.getUnitPrice())
                        .finalPrice(ci.getFinalPrice())
                        .build())
                .collect(Collectors.toCollection(ArrayList::new));
        orderItemRepository.saveAll(orderItems);
        orderItemRepository.flush(); // Ensure items are persisted immediately
        order.setItems(orderItems);
    }

    private void finalizePaidOrder(Order order, List<String> cartItemIds) {
        if (order.getUser() != null && cartItemIds != null && !cartItemIds.isEmpty()) {
            cartService.removeCartItemsForOrder(order.getUser(), cartItemIds);
        }
        if (order.getStatus() == OrderStatus.CREATED) {
            order.setStatus(OrderStatus.CONFIRMED);
        }
        orderRepository.save(order);
        sendOrderConfirmationEmail(order);
    }

    @Transactional
    public void handleMomoIpn(MomoIpnRequest request) {
        if (request == null || request.getOrderId() == null) {
            return;
        }
        Order order = orderRepository.findByCode(request.getOrderId())
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED));

        if (request.getResultCode() != null && request.getResultCode() != 0) {
            order.setPaymentStatus(PaymentStatus.FAILED);
            orderRepository.save(order);
            return;
        }

        if (Boolean.TRUE.equals(order.getPaid())) {
            return;
        }

        order.setPaymentStatus(PaymentStatus.PAID);
        order.setPaid(true);
        order.setPaymentReference(request.getTransId() != null ? String.valueOf(request.getTransId()) : null);
        orderRepository.save(order);

        finalizePaidOrder(order, parseCartItemIds(order.getCartItemIdsSnapshot()));
    }

    private PaymentMethod resolvePaymentMethod(String value) {
        if (value == null || value.isBlank()) {
            return PaymentMethod.COD;
        }
        try {
            return PaymentMethod.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return PaymentMethod.COD;
        }
    }

    private List<String> parseCartItemIds(String snapshot) {
        if (snapshot == null || snapshot.isBlank()) {
            return new ArrayList<>();
        }
        try {
            List<String> result = objectMapper.readValue(snapshot, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            return result != null ? new ArrayList<>(result) : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private void sendOrderConfirmationEmail(Order order) {
        if (order == null || order.getUser() == null || order.getUser().getEmail() == null) {
            return;
        }
        if (order.getItems() != null) {
            order.getItems().size();
        }
        brevoEmailService.sendOrderConfirmationEmail(order);
    }

    private Address resolveShippingAddress(CreateOrderRequest request, User user) {
        if (request.getAddressId() == null || request.getAddressId().isBlank()) {
            return null;
        }
        Address address = addressRepository.findById(request.getAddressId())
                .orElseThrow(() -> new AppException(ErrorCode.ADDRESS_NOT_EXISTED));

        if (user != null && address.getUsers() != null) {
            boolean belongsToUser = address.getUsers().stream()
                    .anyMatch(u -> u != null && u.getId().equals(user.getId()));
            if (!belongsToUser) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }
        return address;
    }

    private String buildShippingAddressSnapshot(Address address, String rawSnapshot, User user) {
        ShippingSnapshot incoming = parseSnapshot(rawSnapshot);
        ObjectNode node = objectMapper.createObjectNode();

        if (address != null) {
            node.put("addressId", address.getAddressId());
        }

        String resolvedName = firstNonBlank(
                incoming.name,
                address != null ? address.getRecipientName() : null,
                safeValue(null, user));

        String resolvedPhone = firstNonBlank(
                incoming.phone,
                address != null ? address.getRecipientPhoneNumber() : null,
                "");

        String resolvedAddress = firstNonBlank(
                incoming.address,
                address != null ? buildAddressText(address) : null,
                rawSnapshot);

        node.put("name", resolvedName);
        node.put("phone", resolvedPhone);
        node.put("address", resolvedAddress != null ? resolvedAddress : "");

        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException e) {
            return rawSnapshot != null ? rawSnapshot : "";
        }
    }

    private ShippingSnapshot parseSnapshot(String rawSnapshot) {
        ShippingSnapshot snapshot = new ShippingSnapshot();
        if (rawSnapshot == null || rawSnapshot.isBlank()) {
            return snapshot;
        }

        try {
            JsonNode node = objectMapper.readTree(rawSnapshot);
            snapshot.name = firstNonBlank(
                    node.path("name").asText(null),
                    node.path("receiverName").asText(null),
                    node.path("recipientName").asText(null));
            snapshot.phone = firstNonBlank(
                    node.path("phone").asText(null),
                    node.path("receiverPhone").asText(null),
                    node.path("recipientPhone").asText(null),
                    node.path("recipientPhoneNumber").asText(null));
            snapshot.address = firstNonBlank(
                    node.path("address").asText(null),
                    node.path("fullAddress").asText(null),
                    node.path("addressText").asText(null),
                    rawSnapshot);
        } catch (Exception e) {
            snapshot.address = rawSnapshot;
        }

        return snapshot;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String safeValue(String value, User user) {
        if (value != null && !value.isBlank()) {
            return value;
        }
        if (user != null && user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        if (user != null && user.getEmail() != null) {
            return user.getEmail();
        }
        return "Khách hàng";
    }

    private String buildAddressText(Address address) {
        StringBuilder sb = new StringBuilder();
        appendPart(sb, address.getAddress());
        appendPart(sb, address.getWardName());
        appendPart(sb, address.getDistrictName());
        appendPart(sb, address.getProvinceName());
        appendPart(sb, address.getCountry());
        return sb.toString();
    }

    private void appendPart(StringBuilder sb, String value) {
        if (value == null || value.isBlank()) return;
        if (sb.length() > 0) {
            sb.append(", ");
        }
        sb.append(value);
    }

    private static class ShippingSnapshot {
        String name;
        String phone;
        String address;
    }

    @Getter
    @AllArgsConstructor
    public static class CheckoutResult {
        private final Order order;
        private final String payUrl;
    }

    static class PricingSummary {
        double shippingFee;
        double orderTotal;
        double voucherDiscount;
        List<String> selectedCartItemIds;
        String cartItemIdsSnapshot;
    }

    /**
     * Sinh mã đơn hàng dạng dễ đọc cho khách, đảm bảo gần như không trùng.
     * Ví dụ: NVB20241120-AB1234
     */
    private String generateOrderCode() {
        String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE); // yyyyMMdd
        String randomPart = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .toUpperCase(Locale.ROOT)
                .substring(0, 6);
        return "NVB" + datePart + "-" + randomPart;
    }

    /**
     * Danh sách tất cả đơn hàng cho nhân viên / admin.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    /**
     * Danh sách đơn hàng của chính khách hàng hiện đang đăng nhập.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<Order> getMyOrders() {
        try {
            String email = SecurityUtil.getAuthentication().getName();
            return orderRepository.findByUserEmail(email);
        } catch (Exception e) {
            log.error("Error fetching orders for user: {}", e.getMessage(), e);
            // Return empty list instead of throwing to prevent frontend crash
            return new ArrayList<>();
        }
    }

    /**
     * Lấy chi tiết một đơn hàng theo id, đảm bảo:
     * - STAFF / ADMIN có thể xem mọi đơn
     * - CUSTOMER chỉ được xem đơn của chính mình
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('CUSTOMER','STAFF','ADMIN')")
    public Order getOrderByIdForCurrentUser(String orderId) {
        // Try to find by ID (UUID) first, then by code (order code like NVB20251121-ABC123)
        Order order = orderRepository.findById(orderId)
                .orElseGet(() -> {
                    // If not found by ID, try to find by code
                    return orderRepository.findByCode(orderId)
                            .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED));
                });

        var auth = SecurityUtil.getAuthentication();
        boolean isStaffOrAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> {
                    String role = a.getAuthority();
                    return "ROLE_STAFF".equals(role) || "ROLE_ADMIN".equals(role);
                });

        if (!isStaffOrAdmin) {
            String email = auth.getName();
            if (order.getUser() == null || order.getUser().getEmail() == null
                    || !order.getUser().getEmail().equalsIgnoreCase(email)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }

        // Force load items to avoid lazy loading issues
        // @EntityGraph should have loaded items, but we ensure it here
        if (order.getItems() != null) {
            int itemsCount = order.getItems().size(); // Force load collection
            log.debug("Order {} has {} items", orderId, itemsCount);
            
            order.getItems().forEach(item -> {
                if (item.getProduct() != null) {
                    // Load product name to ensure product is loaded
                    String productName = item.getProduct().getName();
                    log.debug("Item {} has product: {}", item.getId(), productName);
                    
                    // Load product media
                    if (item.getProduct().getDefaultMedia() != null) {
                        item.getProduct().getDefaultMedia().getMediaUrl();
                    }
                    if (item.getProduct().getMediaList() != null) {
                        item.getProduct().getMediaList().size();
                    }
                }
            });
        } else {
            log.warn("Order {} has null items collection", orderId);
        }

        return order;
    }

    /**
     * Nhân viên xác nhận đơn hàng (chuyển trạng thái sang CONFIRMED).
     */
    @Transactional
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public Order confirmOrder(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED));

        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.DELIVERED) {
            return order;
        }

        if (order.getStatus() != OrderStatus.CONFIRMED) {
            order.setStatus(OrderStatus.CONFIRMED);
            orderRepository.save(order);
        }

        return order;
    }
}

