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

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nova_beauty.backend.dto.request.CreateOrderRequest;
import com.nova_beauty.backend.dto.request.DirectCheckoutRequest;
import com.nova_beauty.backend.dto.request.MomoIpnRequest;
import com.nova_beauty.backend.dto.request.RejectRefundRequest;
import com.nova_beauty.backend.dto.request.ReturnProcessRequest;
import com.nova_beauty.backend.dto.request.ReturnRequestRequest;
import com.nova_beauty.backend.dto.response.CreateMomoResponse;
import com.nova_beauty.backend.dto.response.OrderStatistics;
import com.nova_beauty.backend.entity.Address;
import com.nova_beauty.backend.entity.Cart;
import com.nova_beauty.backend.entity.CartItem;
import com.nova_beauty.backend.entity.Order;
import com.nova_beauty.backend.entity.OrderItem;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.enums.CancellationSource;
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
import com.nova_beauty.backend.service.FinancialService;
import com.nova_beauty.backend.service.ShipmentService;
import com.nova_beauty.backend.util.SecurityUtil;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

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
    ShipmentService shipmentService;
    FinancialService financialService;

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

        // Nếu là COD, finalize ngay nhưng giữ status CREATED để hiển thị "Chờ xác nhận"
        // COD orders sẽ được staff xác nhận thủ công sau đó
        if (paymentMethod == PaymentMethod.COD) {
            // Không cần xóa cart items vì không có
            // Giữ status CREATED để hiển thị "Chờ xác nhận"
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
        // COD orders giữ status CREATED để hiển thị "Chờ xác nhận" 
        // Chỉ MoMo orders mới tự động chuyển sang CONFIRMED sau khi thanh toán thành công
        // COD orders sẽ được staff xác nhận thủ công
        if (order.getStatus() == OrderStatus.CREATED && order.getPaymentMethod() == PaymentMethod.MOMO) {
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
        List<Order> orders = orderRepository.findAll();
        // Đồng bộ trạng thái từ GHN cho các đơn có shipment
        for (Order order : orders) {
            if (order.getShipment() != null && order.getShipment().getOrderCode() != null) {
                try {
                    shipmentService.syncOrderStatusFromGhn(order.getId());
                } catch (Exception e) {
                    log.warn("Không thể đồng bộ trạng thái từ GHN cho order: {}", order.getId(), e);
                }
            }
        }
        // Reload để lấy status mới nhất
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
     * - STAFF / ADMIN / CUSTOMER_SUPPORT có thể xem mọi đơn
     * - CUSTOMER chỉ được xem đơn của chính mình
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('CUSTOMER','CUSTOMER_SUPPORT','STAFF','ADMIN')")
    public Order getOrderByIdForCurrentUser(String orderId) {
        // Đồng bộ trạng thái từ GHN
        try {
            shipmentService.syncOrderStatusFromGhn(orderId);
        } catch (Exception e) {
            log.warn("Không thể đồng bộ trạng thái từ GHN cho order: {}", orderId, e);
        }

        // Tìm đơn hàng theo id
        Order order =
                orderRepository
                        .findById(orderId)
                        .orElseGet(
                                () ->
                                        orderRepository
                                                .findByCode(orderId)
                                                .orElseThrow(
                                                        () ->
                                                                new AppException(
                                                                        ErrorCode.ORDER_NOT_EXISTED)));

        var auth = SecurityUtil.getAuthentication();
        boolean isStaffOrAdminOrSupport =
                auth.getAuthorities().stream()
                        .anyMatch(
                                a -> {
                                    String role = a.getAuthority();
                                    return "ROLE_STAFF".equals(role)
                                            || "ROLE_ADMIN".equals(role)
                                            || "ROLE_CUSTOMER_SUPPORT".equals(role);
                                });

        if (!isStaffOrAdminOrSupport) {
            String email = auth.getName();
            if (order.getUser() == null
                    || order.getUser().getEmail() == null
                    || !order.getUser().getEmail().equalsIgnoreCase(email)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }

        // Load items để tránh vấn đề lazy loading
        if (order.getItems() != null) {
            order.getItems().size();
            order.getItems()
                    .forEach(
                            item -> {
                                if (item.getProduct() != null) {
                                    item.getProduct().getName();
                                    if (item.getProduct().getDefaultMedia() != null) {
                                        item.getProduct().getDefaultMedia().getMediaUrl();
                                    }
                                    if (item.getProduct().getMediaList() != null) {
                                        item.getProduct().getMediaList().size();
                                    }
                                }
                            });
        }

        return order;
    }

    /**
     * Nhân viên xác nhận đơn hàng (chuyển trạng thái sang CONFIRMED).
     */
    @Transactional
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public Order confirmOrder(String orderId) {
        Order order =
                orderRepository
                        .findById(orderId)
                        .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED));

        if (order.getStatus() == OrderStatus.CANCELLED
                || order.getStatus() == OrderStatus.DELIVERED) {
            return order;
        }

        if (order.getStatus() != OrderStatus.CONFIRMED) {
            order.setStatus(OrderStatus.CONFIRMED);
            orderRepository.save(order);
        }

        return order;
    }

    // Thống kê đơn hàng theo khoảng thời gian
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public OrderStatistics getOrderStatistics(LocalDate start, LocalDate end) {
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(23, 59, 59, 999999999);

        Long totalOrders =
                orderRepository.countByOrderDateTimeBetween(startDateTime, endDateTime);
        Long cancelledOrders =
                orderRepository.countCancelledOrdersByOrderDateTimeBetween(
                        startDateTime, endDateTime);
        Long refundedOrders =
                orderRepository.countRefundedOrdersByOrderDateTimeBetween(
                        startDateTime, endDateTime);

        return OrderStatistics.builder()
                .totalOrders(totalOrders)
                .cancelledOrders(cancelledOrders)
                .refundedOrders(refundedOrders)
                .build();
    }

    // Lấy danh sách đơn hàng trong khoảng thời gian với pagination
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public Page<Order> getOrdersByDateRangePage(
            LocalDate start, LocalDate end, int page, int size) {
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(23, 59, 59, 999999999);

        Pageable pageable = PageRequest.of(page, size);
        return orderRepository.findByOrderDateTimeBetween(startDateTime, endDateTime, pageable);
    }

    // Danh sách các yêu cầu trả hàng/hoàn tiền.
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('CUSTOMER_SUPPORT','STAFF','ADMIN')")
    public List<Order> getReturnRequests() {
        List<OrderStatus> returnStatuses =
                List.of(
                        OrderStatus.RETURN_REQUESTED,
                        OrderStatus.RETURN_CS_CONFIRMED,
                        OrderStatus.RETURN_STAFF_CONFIRMED,
                        OrderStatus.RETURN_REJECTED);
        return orderRepository.findByStatusIn(returnStatuses);
    }

    @Transactional
    public Order requestReturn(String orderId, ReturnRequestRequest request) {
        log.info("Processing request return for order: {}", orderId);
        try {
            Order order =
                    orderRepository
                            .findById(orderId)
                            .orElseThrow(
                                    () -> {
                                        log.error("Order not found: {}", orderId);
                                        return new AppException(ErrorCode.ORDER_NOT_EXISTED);
                                    });

            log.info("Order found: {}, current status: {}", orderId, order.getStatus());

            // Đồng bộ trạng thái từ GHN trước khi kiểm tra điều kiện request return
            // Để đảm bảo status được cập nhật mới nhất từ GHN
            try {
                shipmentService.syncOrderStatusFromGhn(orderId);
                // Reload order để lấy status mới nhất sau khi sync
                order =
                        orderRepository
                                .findById(orderId)
                                .orElseThrow(
                                        () -> new AppException(ErrorCode.ORDER_NOT_EXISTED));
                log.info(
                        "Order status after sync from GHN: {}, status: {}",
                        orderId,
                        order.getStatus());
            } catch (Exception e) {
                log.warn(
                        "Failed to sync order status from GHN for order {}: {}",
                        orderId,
                        e.getMessage());
                // Tiếp tục với status hiện tại nếu sync thất bại
            }

            // Cho phép yêu cầu trả hàng từ DELIVERED hoặc gửi lại từ RETURN_REJECTED
            if (order.getStatus() != OrderStatus.DELIVERED
                    && order.getStatus() != OrderStatus.RETURN_REJECTED) {
                log.warn(
                        "Invalid order status for return request: orderId={}, status={}",
                        orderId,
                        order.getStatus());
                throw new AppException(
                        ErrorCode.UNCATEGORIZED_EXCEPTION,
                        String.format(
                                "Chỉ có thể yêu cầu trả hàng cho đơn hàng đã giao (DELIVERED) hoặc đơn hàng đã bị từ chối hoàn tiền (RETURN_REJECTED). Trạng thái hiện tại: %s",
                                order.getStatus() != null
                                        ? order.getStatus().name()
                                        : "null"));
            }

            // Force load items để tránh LazyInitializationException
            if (order.getItems() != null) {
                order.getItems().size(); // Trigger lazy loading
                log.info("Loaded {} items for order: {}", order.getItems().size(), orderId);
            }

            order.setStatus(OrderStatus.RETURN_REQUESTED);

            // Save refund request information to dedicated fields
            if (request != null) {
                order.setRefundReasonType(request.getReasonType());
                order.setRefundDescription(request.getDescription());
                order.setRefundEmail(request.getEmail());
                order.setRefundReturnAddress(request.getReturnAddress());
                order.setRefundMethod(request.getRefundMethod());
                order.setRefundBank(request.getBank());
                order.setRefundAccountNumber(request.getAccountNumber());
                order.setRefundAccountHolder(request.getAccountHolder());

                // Save selected product IDs as JSON array
                if (request.getSelectedProductIds() != null
                        && !request.getSelectedProductIds().isEmpty()) {
                    try {
                        String productIdsJson =
                                objectMapper.writeValueAsString(
                                        request.getSelectedProductIds());
                        order.setRefundSelectedProductIds(productIdsJson);
                    } catch (Exception e) {
                        log.warn("Failed to serialize selected product IDs to JSON", e);
                        order.setRefundSelectedProductIds(null);
                    }
                }

                // Save media URLs as JSON array
                if (request.getMediaUrls() != null && !request.getMediaUrls().isEmpty()) {
                    try {
                        String mediaUrlsJson =
                                objectMapper.writeValueAsString(request.getMediaUrls());
                        order.setRefundMediaUrls(mediaUrlsJson);
                    } catch (Exception e) {
                        log.warn("Failed to serialize media URLs to JSON", e);
                        order.setRefundMediaUrls(null);
                    }
                }

                // Calculate and save refund amount and return fee
                if (order.getItems() != null && request.getSelectedProductIds() != null) {
                    try {
                        double productValue =
                                order.getItems().stream()
                                        .filter(
                                                item ->
                                                        request.getSelectedProductIds()
                                                                .contains(item.getId()))
                                        .mapToDouble(
                                                item ->
                                                        item.getFinalPrice() != null
                                                                ? item.getFinalPrice()
                                                                : 0.0)
                                        .sum();

                        double shippingFee =
                                order.getShippingFee() != null ? order.getShippingFee() : 0.0;
                        double totalPaid =
                                order.getTotalAmount() != null
                                        ? order.getTotalAmount()
                                        : productValue + shippingFee;

                        double computedReturnFee = 0.0;
                        try {
                            computedReturnFee =
                                    shipmentService.estimateReturnShippingFee(order);
                        } catch (Exception e) {
                            log.warn(
                                    "Failed to estimate return shipping fee for order {}: {}",
                                    orderId,
                                    e.getMessage());
                            // Continue with fallback calculation
                        }

                        boolean isStoreReason =
                                "store".equalsIgnoreCase(request.getReasonType());
                        double fallbackReturnFee =
                                isStoreReason
                                        ? shippingFee
                                        : Math.round(productValue * 0.1);
                        double secondShippingFee =
                                computedReturnFee > 0
                                        ? Math.round(computedReturnFee)
                                        : Math.max(0.0, fallbackReturnFee);

                        double penaltyAmount =
                                !isStoreReason
                                        ? Math.max(0.0, Math.round(productValue * 0.1))
                                        : 0.0;

                        double customerRefundAmount =
                                isStoreReason
                                        ? totalPaid + secondShippingFee
                                        : Math.max(
                                                0.0, totalPaid - secondShippingFee - penaltyAmount);

                        order.setRefundAmount(customerRefundAmount);
                        order.setRefundReturnFee(secondShippingFee);
                        order.setRefundSecondShippingFee(secondShippingFee);
                        order.setRefundPenaltyAmount(penaltyAmount);
                        order.setRefundTotalPaid(totalPaid);
                        // Initialize confirmed values to match customer request, can be adjusted by staff
                        // later
                        order.setRefundConfirmedAmount(customerRefundAmount);
                        order.setRefundConfirmedPenalty(penaltyAmount);
                        order.setRefundConfirmedSecondShippingFee(secondShippingFee);
                    } catch (Exception e) {
                        log.error(
                                "Error calculating refund amount for order {}: {}",
                                orderId,
                                e.getMessage(),
                                e);
                        // Set default values to allow request to proceed
                        double shippingFee =
                                order.getShippingFee() != null ? order.getShippingFee() : 0.0;
                        double totalPaid =
                                order.getTotalAmount() != null ? order.getTotalAmount() : 0.0;
                        order.setRefundAmount(totalPaid);
                        order.setRefundReturnFee(shippingFee);
                        order.setRefundSecondShippingFee(shippingFee);
                        order.setRefundPenaltyAmount(0.0);
                        order.setRefundTotalPaid(totalPaid);
                        order.setRefundConfirmedAmount(totalPaid);
                        order.setRefundConfirmedPenalty(0.0);
                        order.setRefundConfirmedSecondShippingFee(shippingFee);
                    }
                }

                // Also save to note field for backward compatibility
                if (request.getNote() != null && !request.getNote().isBlank()) {
                    order.setNote(request.getNote());
                } else {
                    // Generate note from request data for backward compatibility
                    StringBuilder noteBuilder = new StringBuilder();
                    if (request.getReasonType() != null) {
                        String reasonText =
                                "store".equals(request.getReasonType())
                                        ? "Sản phẩm gặp sự cố từ cửa hàng"
                                        : "Thay đổi nhu cầu / Mua nhầm";
                        noteBuilder
                                .append("Yêu cầu hoàn tiền/trả hàng - ")
                                .append(reasonText);
                    }
                    if (request.getDescription() != null
                            && !request.getDescription().isBlank()) {
                        noteBuilder
                                .append("\nMô tả: ")
                                .append(request.getDescription());
                    }
                    if (request.getReturnAddress() != null
                            && !request.getReturnAddress().isBlank()) {
                        noteBuilder
                                .append("\nĐịa chỉ gửi hàng: ")
                                .append(request.getReturnAddress());
                    }
                    if (request.getRefundMethod() != null
                            && !request.getRefundMethod().isBlank()) {
                        noteBuilder
                                .append("\nPhương thức hoàn tiền: ")
                                .append(request.getRefundMethod());
                    }
                    if (request.getBank() != null && !request.getBank().isBlank()) {
                        noteBuilder.append("\nNgân hàng: ").append(request.getBank());
                    }
                    if (request.getAccountNumber() != null
                            && !request.getAccountNumber().isBlank()) {
                        noteBuilder
                                .append("\nSố tài khoản: ")
                                .append(request.getAccountNumber());
                    }
                    if (request.getAccountHolder() != null
                            && !request.getAccountHolder().isBlank()) {
                        noteBuilder
                                .append("\nChủ tài khoản: ")
                                .append(request.getAccountHolder());
                    }
                    order.setNote(noteBuilder.toString());
                }
            }

            log.info("Saving order with return request: {}", orderId);
            Order saved = orderRepository.save(order);
            log.info("Order saved successfully: {}", orderId);

            // Gửi thông báo in-app cho bộ phận CSKH về yêu cầu hoàn tiền / trả hàng mới
            try {
                String customerName =
                        order.getUser() != null && order.getUser().getFullName() != null
                                ? order.getUser().getFullName()
                                : "Khách hàng";
                String title = "Yêu cầu hoàn tiền / trả hàng mới";
                String message =
                        String.format(
                                "%s đã gửi yêu cầu hoàn tiền/trả hàng cho đơn hàng %s.",
                                customerName, order.getCode());
                String link = "/customer-support/refund-management";
                // Bạn có thể implement NotificationService tương tự LuminaBook nếu cần
                // notificationService.sendToRole(title, message, "INFO", "CUSTOMER_SUPPORT",
                // link);
                log.info("Notification (mock) sent successfully for order: {}", orderId);
            } catch (Exception e) {
                log.error(
                        "Failed to send notification to CS for return request {}: {}",
                        orderId,
                        e.getMessage(),
                        e);
                // Không throw exception vì notification là optional
            }

            log.info("Request return completed successfully for order: {}", orderId);
            return saved;
        } catch (AppException e) {
            // Re-throw AppException để giữ nguyên error code và message
            log.error(
                    "AppException in requestReturn for order {}: code={}, message={}",
                    orderId,
                    e.getErrorCode().getCode(),
                    e.getMessage(),
                    e);
            throw e;
        } catch (Exception e) {
            log.error(
                    "Unexpected error in requestReturn for order {}: {}",
                    orderId,
                    e.getMessage(),
                    e);
            log.error("Exception stack trace:", e);
            throw new AppException(
                    ErrorCode.UNCATEGORIZED_EXCEPTION,
                    "Có lỗi xảy ra khi xử lý yêu cầu trả hàng. Vui lòng thử lại sau.");
        }
    }

    @Transactional
    public Order rejectRefund(String orderId, RejectRefundRequest request) {
        Order order =
                orderRepository
                        .findById(orderId)
                        .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED));

        // Chỉ có thể từ chối đơn hàng chưa hoàn tất
        if (order.getStatus() != OrderStatus.RETURN_REQUESTED
                && order.getStatus() != OrderStatus.RETURN_CS_CONFIRMED
                && order.getStatus() != OrderStatus.RETURN_STAFF_CONFIRMED) {
            throw new AppException(
                    ErrorCode.UNCATEGORIZED_EXCEPTION,
                    "Chỉ có thể từ chối yêu cầu hoàn tiền cho đơn hàng đang ở trạng thái 'Hoàn tiền/ trả hàng'");
        }

        // Cập nhật status và lưu lý do từ chối
        order.setStatus(OrderStatus.RETURN_REJECTED);
        String rejectionReason =
                request.getReason() != null ? request.getReason() : "Không có lý do";
        order.setRefundRejectionReason(rejectionReason);
        String rejectionSource =
                request.getSource() != null ? request.getSource().trim() : null;
        order.setRefundRejectionSource(
                rejectionSource != null && !rejectionSource.isBlank()
                        ? rejectionSource.toUpperCase()
                        : null);
        // Cũng lưu vào note để tương thích với code cũ
        String rejectionNote =
                "Yêu cầu hoàn tiền đã bị từ chối. Lý do: " + rejectionReason;
        order.setNote(rejectionNote);

        Order saved = orderRepository.save(order);

        // Gửi email thông báo cho khách khi yêu cầu hoàn tiền bị từ chối
        try {
            brevoEmailService.sendReturnRejectedEmail(saved);
        } catch (Exception e) {
            log.error(
                    "Failed to send return rejected email for order {}: {}",
                    orderId,
                    e.getMessage(),
                    e);
        }

        return saved;
    }

    @Transactional
    public Order csConfirmReturn(String orderId, ReturnProcessRequest request) {
        Order order =
                orderRepository
                        .findById(orderId)
                        .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED));

        // Chỉ có thể xác nhận hoàn tiền cho đơn hàng có status RETURN_REQUESTED
        if (order.getStatus() != OrderStatus.RETURN_REQUESTED) {
            throw new AppException(
                    ErrorCode.UNCATEGORIZED_EXCEPTION,
                    "Chỉ xác nhận các đơn đang ở trạng thái 'Khách yêu cầu hoàn tiền / trả hàng'");
        }

        appendProcessingNote(order, request);
        order.setStatus(OrderStatus.RETURN_CS_CONFIRMED);
        Order saved = orderRepository.save(order);

        // Gửi email thông báo cho khách hàng: CSKH đã xác nhận yêu cầu hoàn tiền/trả hàng
        try {
            brevoEmailService.sendReturnCsConfirmedEmail(saved);
        } catch (Exception e) {
            log.error(
                    "Failed to send CS-confirmed return email for order {}: {}",
                    orderId,
                    e.getMessage(),
                    e);
        }

        // TODO: Gửi thông báo in-app cho STAFF nếu bạn triển khai NotificationService

        return saved;
    }

    @Transactional
    public Order staffConfirmReturn(String orderId, ReturnProcessRequest request) {
        Order order =
                orderRepository
                        .findById(orderId)
                        .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED));

        if (order.getStatus() != OrderStatus.RETURN_CS_CONFIRMED) {
            throw new AppException(
                    ErrorCode.UNCATEGORIZED_EXCEPTION,
                    "Chỉ xử lý các đơn đã được CSKH xác nhận.");
        }

        appendProcessingNote(order, request);
        if (request != null
                && request.getNote() != null
                && !request.getNote().isBlank()) {
            order.setStaffInspectionResult(request.getNote().trim());
        }
        if (request != null && request.getRefundAmount() != null) {
            order.setRefundAmount(request.getRefundAmount());
            // Coi như đây là số tiền hoàn dự kiến do nhân viên xác nhận
            order.setRefundConfirmedAmount(request.getRefundAmount());
        }
        LocalDate requestedReturnDate =
                request != null ? request.getReturnCheckedDate() : null;
        if (requestedReturnDate != null) {
            order.setReturnCheckedDate(requestedReturnDate);
        } else if (order.getReturnCheckedDate() == null) {
            order.setReturnCheckedDate(LocalDate.now());
        }
        order.setStatus(OrderStatus.RETURN_STAFF_CONFIRMED);
        Order saved = orderRepository.save(order);

        // Gửi email cho khách về kết quả kiểm tra hàng (lỗi bên nào, số tiền dự kiến hoàn)
        try {
            brevoEmailService.sendReturnStaffInspectionEmail(saved);
        } catch (Exception e) {
            log.error(
                    "Failed to send staff inspection email for order {}: {}",
                    orderId,
                    e.getMessage(),
                    e);
        }

        return saved;
    }

    @Transactional
    public Order confirmRefund(String orderId, ReturnProcessRequest request) {
        Order order =
                orderRepository
                        .findById(orderId)
                        .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED));

        // Chỉ có thể xác nhận hoàn tiền cho đơn hàng đã được staff kiểm tra
        if (order.getStatus() != OrderStatus.RETURN_STAFF_CONFIRMED) {
            throw new AppException(
                    ErrorCode.UNCATEGORIZED_EXCEPTION,
                    "Chỉ có thể xác nhận hoàn tiền cho đơn hàng đang ở trạng thái 'Hoàn tiền/ trả hàng'");
        }

        if (request != null
                && request.getNote() != null
                && !request.getNote().isBlank()) {
            String trimmed = request.getNote().trim();
            order.setAdminProcessingNote(trimmed);
            appendProcessingNote(
                    order, ReturnProcessRequest.builder().note(trimmed).build());
        }

        if (request != null && request.getRefundAmount() != null) {
            order.setRefundAmount(request.getRefundAmount());
        }
        order.setStatus(OrderStatus.REFUNDED);

        Order savedOrder = orderRepository.save(order);
        notifyStaffOrderReturned(savedOrder);
        return savedOrder;
    }

    @Transactional
    public Order cancelOrder(String orderId, String reason) {
        Order order =
                orderRepository
                        .findById(orderId)
                        .orElseGet(
                                () ->
                                        orderRepository
                                                .findByCode(orderId)
                                                .orElseThrow(
                                                        () ->
                                                                new AppException(
                                                                        ErrorCode
                                                                                .ORDER_NOT_EXISTED)));

        OrderStatus currentStatus =
                order.getStatus() != null ? order.getStatus() : OrderStatus.CREATED;
        if (currentStatus == OrderStatus.DELIVERED
                || currentStatus == OrderStatus.SHIPPED
                || currentStatus == OrderStatus.REFUNDED) {
            throw new AppException(
                    ErrorCode.UNCATEGORIZED_EXCEPTION,
                    "Không thể hủy đơn hàng ở trạng thái hiện tại.");
        }

        if (currentStatus == OrderStatus.CANCELLED) {
            boolean updated = false;
            if (order.getCancellationReason() == null
                    && reason != null
                    && !reason.isBlank()) {
                String resolvedReason = reason.trim();
                order.setCancellationReason(resolvedReason);
                order.setNote(buildCancellationNote(resolvedReason));
                updated = true;
            }
            if (order.getCancellationSource() == null) {
                order.setCancellationSource(
                        guessCancellationSourceFromReason(
                                order.getCancellationReason()));
                updated = true;
            }
            Order saved = updated ? orderRepository.save(order) : order;
            if (saved.getCancellationSource() == CancellationSource.CUSTOMER) {
                notifyStaffOrderCancelledByCustomer(saved);
            }
            return saved;
        }

        var auth = SecurityUtil.getAuthentication();
        boolean isPrivileged =
                auth.getAuthorities().stream()
                        .anyMatch(
                                a -> {
                                    String role = a.getAuthority();
                                    return "ROLE_STAFF".equals(role)
                                            || "ROLE_ADMIN".equals(role)
                                            || "ROLE_CUSTOMER_SUPPORT".equals(role);
                                });

        if (!isPrivileged) {
            String email = auth.getName();
            if (order.getUser() == null
                    || order.getUser().getEmail() == null
                    || !order.getUser().getEmail().equalsIgnoreCase(email)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }

        CancellationSource source =
                isPrivileged ? CancellationSource.STAFF : CancellationSource.CUSTOMER;
        String resolvedReason =
                (reason != null && !reason.isBlank())
                        ? reason.trim()
                        : (source == CancellationSource.STAFF
                                ? "Nhân viên hủy đơn"
                                : "Khách hàng hủy đơn");

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancellationReason(resolvedReason);
        order.setCancellationSource(source);
        order.setNote(buildCancellationNote(resolvedReason));

        Order savedOrder = orderRepository.save(order);
        if (source == CancellationSource.CUSTOMER) {
            notifyStaffOrderCancelledByCustomer(savedOrder);
        }
        return savedOrder;
    }

    private String buildCancellationNote(String reason) {
        if (reason == null || reason.isBlank()) {
            return "Đơn hàng đã được hủy.";
        }
        return "Đơn hàng đã được hủy. Lý do: " + reason;
    }

    private CancellationSource guessCancellationSourceFromReason(String reason) {
        if (reason == null) {
            return null;
        }
        String normalized = reason.toLowerCase();
        if (normalized.contains("nhân viên") || normalized.contains("cửa hàng")) {
            return CancellationSource.STAFF;
        }
        if (normalized.contains("khách hàng") || normalized.contains("khach hang")) {
            return CancellationSource.CUSTOMER;
        }
        return null;
    }

    private void notifyStaffOrderCancelledByCustomer(Order order) {
        try {
            String code = resolveDisplayOrderCode(order);
            int itemCount = order.getItems() != null ? order.getItems().size() : 0;
            String message =
                    itemCount > 0
                            ? String.format(
                                    "Khách hàng đã hủy đơn %s với %d sản phẩm. Vui lòng kiểm tra tồn kho/đơn hàng.",
                                    code, itemCount)
                            : String.format(
                                    "Khách hàng đã hủy đơn %s. Vui lòng kiểm tra tồn kho/đơn hàng.",
                                    code);
            // TODO: implement notificationService.sendToStaff(...) if needed
            log.info(
                    "Mock notify staff order cancelled by customer: orderId={}, message={}",
                    order.getId(),
                    message);
        } catch (Exception e) {
            log.warn(
                    "Không thể gửi thông báo hủy đơn bởi khách hàng cho order {}",
                    order.getId(),
                    e);
        }
    }

    private void notifyStaffOrderReturned(Order order) {
        try {
            String code = resolveDisplayOrderCode(order);
            // TODO: implement notificationService.sendToStaff(...) if needed
            log.info(
                    "Mock notify staff order returned: orderId={}, code={}",
                    order.getId(),
                    code);
        } catch (Exception e) {
            log.warn(
                    "Không thể gửi thông báo đơn hoàn về cho order {}",
                    order.getId(),
                    e);
        }
    }

    private String resolveDisplayOrderCode(Order order) {
        if (order == null) return "";
        if (order.getCode() != null && !order.getCode().isBlank()) {
            return order.getCode();
        }
        return order.getId();
    }

    private void appendProcessingNote(Order order, ReturnProcessRequest request) {
        if (request == null) {
            return;
        }
        String note = request.getNote();
        if (note == null || note.isBlank()) {
            return;
        }
        String current = order.getNote();
        if (current == null || current.isBlank()) {
            order.setNote(note.trim());
        } else {
            order.setNote(current + System.lineSeparator() + note.trim());
        }
    }
}

