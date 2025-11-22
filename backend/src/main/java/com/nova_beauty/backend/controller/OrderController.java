package com.nova_beauty.backend.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.dto.request.CreateOrderRequest;
import com.nova_beauty.backend.dto.request.DirectCheckoutRequest;
import com.nova_beauty.backend.dto.response.CheckoutInitResponse;
import com.nova_beauty.backend.dto.response.OrderDetailResponse;
import com.nova_beauty.backend.dto.response.OrderItemResponse;
import com.nova_beauty.backend.dto.response.OrderResponse;
import com.nova_beauty.backend.entity.Address;
import com.nova_beauty.backend.entity.Order;
import com.nova_beauty.backend.service.OrderService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class OrderController {

    OrderService orderService;
    ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/checkout")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<CheckoutInitResponse> createOrder(@RequestBody CreateOrderRequest request) {
        OrderService.CheckoutResult result = orderService.createOrderFromCurrentCart(request);
        CheckoutInitResponse response = CheckoutInitResponse.builder()
                .order(toResponse(result.getOrder()))
                .payUrl(result.getPayUrl())
                .build();
        return ApiResponse.<CheckoutInitResponse>builder()
                .result(response)
                .build();
    }

    @PostMapping("/checkout-direct")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<CheckoutInitResponse> createOrderDirectly(@RequestBody DirectCheckoutRequest request) {
        OrderService.CheckoutResult result = orderService.createOrderDirectly(request);
        CheckoutInitResponse response = CheckoutInitResponse.builder()
                .order(toResponse(result.getOrder()))
                .payUrl(result.getPayUrl())
                .build();
        return ApiResponse.<CheckoutInitResponse>builder()
                .result(response)
                .build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<List<OrderResponse>> getAllOrders() {
        List<Order> orders = orderService.getAllOrders();
        return ApiResponse.<List<OrderResponse>>builder()
                .result(orders.stream().map(this::toResponse).toList())
                .build();
    }

    @GetMapping("/my-orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ApiResponse<List<OrderResponse>> getMyOrders() {
        List<Order> orders = orderService.getMyOrders();
        return ApiResponse.<List<OrderResponse>>builder()
                .result(orders.stream().map(this::toResponse).toList())
                .build();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER','STAFF','ADMIN')")
    public ApiResponse<OrderDetailResponse> getOrderById(@PathVariable String id) {
        Order order = orderService.getOrderByIdForCurrentUser(id);
        return ApiResponse.<OrderDetailResponse>builder()
                .result(toDetailResponse(order))
                .build();
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public ApiResponse<OrderDetailResponse> confirmOrder(@PathVariable String id) {
        Order order = orderService.confirmOrder(id);
        return ApiResponse.<OrderDetailResponse>builder()
                .result(toDetailResponse(order))
                .build();
    }

    private OrderResponse toResponse(Order order) {
        if (order == null) {
            return null;
        }
        String customerName = "Khách hàng";
        String customerEmail = null;
        if (order.getUser() != null) {
            customerEmail = order.getUser().getEmail();
            String fullName = order.getUser().getFullName();
            if (fullName != null && !fullName.isBlank()) {
                customerName = fullName;
            } else if (customerEmail != null) {
                customerName = customerEmail;
            }
        }

        return OrderResponse.builder()
                .id(order.getId())
                .code(order.getCode() != null ? order.getCode() : order.getId())
                .customerName(customerName)
                .customerEmail(customerEmail)
                .receiverName(resolveReceiverName(order, customerName))
                .receiverPhone(resolveReceiverPhone(order))
                .shippingAddress(resolveShippingAddressText(order))
                .orderDate(order.getOrderDate())
                .orderDateTime(resolveOrderDateTime(order))
                .shippingFee(order.getShippingFee())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus() != null ? order.getStatus().name() : null)
                .paymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null)
                .paymentStatus(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null)
                .paid(order.getPaid())
                .paymentReference(order.getPaymentReference())
                .build();
    }

    private OrderDetailResponse toDetailResponse(Order order) {
        if (order == null) {
            return null;
        }
        String customerName = "Khách hàng";
        String customerEmail = null;
        if (order.getUser() != null) {
            customerEmail = order.getUser().getEmail();
            String fullName = order.getUser().getFullName();
            if (fullName != null && !fullName.isBlank()) {
                customerName = fullName;
            } else if (customerEmail != null) {
                customerName = customerEmail;
            }
        }

        List<OrderItemResponse> items = order.getItems() == null
                ? List.of()
                : order.getItems().stream()
                        .map(oi -> {
                            String imageUrl = null;
                            if (oi.getProduct() != null) {
                                // Lấy ảnh từ defaultMedia hoặc mediaList đầu tiên
                                if (oi.getProduct().getDefaultMedia() != null) {
                                    imageUrl = oi.getProduct().getDefaultMedia().getMediaUrl();
                                } else if (oi.getProduct().getMediaList() != null 
                                        && !oi.getProduct().getMediaList().isEmpty()) {
                                    imageUrl = oi.getProduct().getMediaList().get(0).getMediaUrl();
                                }
                            }
                            return OrderItemResponse.builder()
                                    .id(oi.getId())
                                    .productId(oi.getProduct() != null ? oi.getProduct().getId() : null)
                                    .name(oi.getProduct() != null ? oi.getProduct().getName() : null)
                                    .imageUrl(imageUrl)
                                    .quantity(oi.getQuantity())
                                    .unitPrice(oi.getUnitPrice())
                                    .totalPrice(oi.getFinalPrice())
                                    .build();
                        })
                        .collect(Collectors.toList());

        return OrderDetailResponse.builder()
                .id(order.getId())
                .code(order.getCode() != null ? order.getCode() : order.getId())
                .customerName(customerName)
                .customerEmail(customerEmail)
                .receiverName(resolveReceiverName(order, customerName))
                .receiverPhone(resolveReceiverPhone(order))
                .shippingAddress(resolveShippingAddressText(order))
                .orderDate(order.getOrderDate())
                .orderDateTime(resolveOrderDateTime(order))
                .shippingFee(order.getShippingFee())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus() != null ? order.getStatus().name() : null)
                .paymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null)
                .paymentStatus(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null)
                .paid(order.getPaid())
                .paymentReference(order.getPaymentReference())
                .items(items)
                .build();
    }

    private String resolveReceiverName(Order order, String fallback) {
        ShippingSnapshot snapshot = parseShippingSnapshot(order.getShippingAddress());
        if (snapshot.name != null && !snapshot.name.isBlank()) {
            return snapshot.name;
        }
        if (order.getAddress() != null && order.getAddress().getRecipientName() != null
                && !order.getAddress().getRecipientName().isBlank()) {
            return order.getAddress().getRecipientName();
        }
        return fallback;
    }

    private String resolveReceiverPhone(Order order) {
        ShippingSnapshot snapshot = parseShippingSnapshot(order.getShippingAddress());
        if (snapshot.phone != null && !snapshot.phone.isBlank()) {
            return snapshot.phone;
        }
        if (order.getAddress() != null) {
            return order.getAddress().getRecipientPhoneNumber();
        }
        return "";
    }

    private String resolveShippingAddressText(Order order) {
        ShippingSnapshot snapshot = parseShippingSnapshot(order.getShippingAddress());
        if (snapshot.address != null && !snapshot.address.isBlank()) {
            return snapshot.address;
        }
        if (order.getAddress() != null) {
            return buildAddressText(order.getAddress());
        }
        return order.getShippingAddress();
    }

    private ShippingSnapshot parseShippingSnapshot(String raw) {
        ShippingSnapshot snapshot = new ShippingSnapshot();
        if (raw == null || raw.isBlank()) {
            return snapshot;
        }
        try {
            JsonNode node = objectMapper.readTree(raw);
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
                    node.path("addressText").asText(null),
                    node.path("fullAddress").asText(null),
                    raw);
        } catch (Exception e) {
            snapshot.address = raw;
        }
        return snapshot;
    }

    private String buildAddressText(Address address) {
        if (address == null) return "";
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

    private String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private LocalDateTime resolveOrderDateTime(Order order) {
        if (order.getOrderDateTime() != null) {
            return order.getOrderDateTime();
        }
        if (order.getOrderDate() != null) {
            return order.getOrderDate().atStartOfDay();
        }
        return null;
    }

    private static class ShippingSnapshot {
        String name;
        String phone;
        String address;
    }
}

