package com.nova_beauty.backend.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.constant.GhnConstants;
import com.nova_beauty.backend.dto.request.GhnCalculateFeeRequest;
import com.nova_beauty.backend.dto.request.GhnCreateOrderRequest;
import com.nova_beauty.backend.dto.request.GhnLeadtimeRequest;
import com.nova_beauty.backend.dto.request.GhnOrderItemRequest;
import com.nova_beauty.backend.dto.response.GhnDistrictResponse;
import com.nova_beauty.backend.dto.response.GhnFeeResponse;
import com.nova_beauty.backend.dto.response.GhnLeadtimeResponse;
import com.nova_beauty.backend.dto.response.GhnPickShiftResponse;
import com.nova_beauty.backend.dto.response.GhnProvinceResponse;
import com.nova_beauty.backend.dto.response.GhnShipmentDataResponse;
import com.nova_beauty.backend.dto.response.GhnOrderDetailResponse;
import com.nova_beauty.backend.dto.response.GhnWardResponse;
import com.nova_beauty.backend.dto.response.ShipmentResponse;
import com.nova_beauty.backend.entity.Address;
import com.nova_beauty.backend.entity.Order;
import com.nova_beauty.backend.entity.OrderItem;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.Shipment;
import com.nova_beauty.backend.enums.PaymentMethod;
import com.nova_beauty.backend.enums.PaymentStatus;
import com.nova_beauty.backend.enums.OrderStatus;
import com.nova_beauty.backend.enums.ShipmentProvider;
import com.nova_beauty.backend.enums.ShipmentStatus;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.repository.OrderRepository;
import com.nova_beauty.backend.repository.ShipmentRepository;
import com.nova_beauty.backend.mapper.ShipmentMapper;
import com.nova_beauty.backend.mapper.GhnMapper;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ShipmentService {
    ShipmentRepository shipmentRepository;
    OrderRepository orderRepository;
    GhnService ghnService;
    ShipmentMapper shipmentMapper;
    GhnMapper ghnMapper;
    FinancialService financialService;

    // ==================== GHN Master Data APIs ====================

    // Lấy danh sách tỉnh/thành phố từ GHN.
    public List<GhnProvinceResponse> getProvinces() {
        return ghnService.getProvinces();
    }

    // Lấy danh sách quận/huyện theo tỉnh/thành phố.
    public List<GhnDistrictResponse> getDistricts(Integer provinceId) {
        return ghnService.getDistricts(provinceId);
    }

    // Lấy danh sách phường/xã theo quận/huyện.
    public List<GhnWardResponse> getWards(Integer districtId) {
        return ghnService.getWards(districtId);
    }

    // Lấy danh sách ca lấy hàng từ GHN.
    public List<GhnPickShiftResponse> getPickShifts() {
        return ghnService.getPickShifts();
    }

    // ==================== Shipping Fee Calculation ====================

    // Tính phí vận chuyển từ request trực tiếp.
    public GhnFeeResponse calculateShippingFee(GhnCalculateFeeRequest request) {
        return ghnService.calculateShippingFee(request);
    }

    // Tính phí vận chuyển cho một đơn hàng.
    public GhnFeeResponse calculateShippingFee(String orderId) {
        Order order = validateOrderWithAddress(orderId);
        GhnCreateOrderRequest ghnRequest = buildGhnCreateOrderRequest(order, null);
        GhnCalculateFeeRequest feeRequest = ghnMapper.toCalculateFeeRequest(ghnRequest);
        return ghnService.calculateShippingFee(feeRequest);
    }

    /**
     * Ước tính chi phí GHN khi khách trả hàng về kho mặc định.
     * Lấy địa chỉ khách (điểm đến ban đầu) làm điểm lấy hàng và kho Lumina làm điểm giao.
     */
    public double estimateReturnShippingFee(Order order) {
        if (order == null) {
            return 0D;
        }

        try {
            GhnCreateOrderRequest forwardRequest = buildGhnCreateOrderRequest(order, null);
            if (forwardRequest.getToDistrictId() == null || forwardRequest.getToWardCode() == null) {
                return 0D;
            }

            GhnCalculateFeeRequest feeRequest = ghnMapper.toCalculateFeeRequest(forwardRequest);
            feeRequest.setFromDistrictId(forwardRequest.getToDistrictId());
            feeRequest.setFromWardCode(forwardRequest.getToWardCode());
            feeRequest.setToDistrictId(GhnConstants.DEFAULT_FROM_DISTRICT_ID);
            feeRequest.setToWardCode(GhnConstants.DEFAULT_FROM_WARD_CODE);

            GhnFeeResponse response = ghnService.calculateShippingFee(feeRequest);
            return response != null && response.getTotal() != null ? response.getTotal() : 0D;
        } catch (Exception ex) {
            return 0D;
        }
    }

    // ==================== Leadtime Calculation ====================

    // Tính thời gian giao hàng dự kiến từ request trực tiếp.
    public GhnLeadtimeResponse getLeadtime(GhnLeadtimeRequest request) {
        return ghnService.getLeadtime(
                request.getFromDistrictId(),
                request.getFromWardCode(),
                request.getToDistrictId(),
                request.getToWardCode(),
                request.getServiceTypeId());
    }

    // Tính thời gian giao hàng dự kiến cho một đơn hàng.
    public GhnLeadtimeResponse getLeadtime(String orderId) {
        Order order = validateOrderWithAddress(orderId);
        GhnCreateOrderRequest ghnRequest = buildGhnCreateOrderRequest(order, null);
        GhnLeadtimeRequest leadtimeRequest = ghnMapper.toLeadtimeRequest(ghnRequest);
        return getLeadtime(leadtimeRequest);
    }

    // ==================== Order Preview & Creation ====================

    // Xem trước thông tin đơn hàng trước khi tạo (preview).
    public GhnShipmentDataResponse previewOrder(String orderId, List<Integer> pickShiftIds) {
        Order order = validateOrderWithAddress(orderId);
        List<Integer> effectivePickShifts = resolvePickShiftIds(pickShiftIds);
        GhnCreateOrderRequest ghnRequest = buildGhnCreateOrderRequest(order, effectivePickShifts);
        return ghnService.previewOrder(ghnRequest);
    }

    // Tạo đơn hàng GHN từ Order.
    @Transactional
    public ShipmentResponse createGhnOrder(String orderId, List<Integer> pickShiftIds) {
        Order order = validateOrderWithAddress(orderId);
        ensureNoExistingShipment(orderId);

        List<Integer> effectivePickShifts = resolvePickShiftIds(pickShiftIds);
        GhnCreateOrderRequest ghnRequest = buildGhnCreateOrderRequest(order, effectivePickShifts);

        GhnShipmentDataResponse ghnData = ghnService.createOrder(ghnRequest);

        if (ghnData == null) {
            log.error("GHN API returned null response for orderId: {}", orderId);
            throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR,
                    "Không thể tạo đơn hàng GHN. Vui lòng thử lại sau.");
        }

        Shipment shipment = buildShipmentFromGhnData(order, ghnData);
        Shipment saved = shipmentRepository.save(shipment);

        return shipmentMapper.toResponse(saved);
    }

    // ==================== Shipment Retrieval ====================

    // Lấy thông tin vận đơn theo order ID.
    public ShipmentResponse getShipmentByOrderId(String orderId) {
        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_EXISTED,
                        "Không tìm thấy vận đơn cho đơn hàng: " + orderId));
        return shipmentMapper.toResponse(shipment);
    }

    // Lấy thông tin vận đơn theo GHN order code.
    public ShipmentResponse getShipmentByOrderCode(String orderCode) {
        Shipment shipment = shipmentRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_EXISTED,
                        "Không tìm thấy vận đơn với mã GHN: " + orderCode));
        return shipmentMapper.toResponse(shipment);
    }

    // Đồng bộ trạng thái đơn hàng từ GHN API.
    @Transactional
    public void syncOrderStatusFromGhn(String orderId) {
        try {
            Shipment shipment = shipmentRepository.findByOrderId(orderId).orElse(null);
            if (shipment == null || shipment.getOrderCode() == null || shipment.getOrderCode().isBlank()) {
                return;
            }

            Order order = shipment.getOrder();
            if (order == null) {
                return;
            }

            OrderStatus currentStatus = order.getStatus();
            // Không sync GHN nếu đơn đang trong luồng hoàn tiền/trả hàng
            if (currentStatus == OrderStatus.CANCELLED ||
                currentStatus == OrderStatus.RETURN_REQUESTED ||
                currentStatus == OrderStatus.RETURN_CS_CONFIRMED ||
                currentStatus == OrderStatus.RETURN_STAFF_CONFIRMED ||
                currentStatus == OrderStatus.REFUNDED ||
                currentStatus == OrderStatus.RETURN_REJECTED) {
                return;
            }

            // Gọi GHN API để lấy trạng thái mới nhất
            GhnOrderDetailResponse ghnDetail;
            try {
                ghnDetail = ghnService.getOrderDetail(shipment.getOrderCode());
            } catch (Exception e) {
                return; // Bỏ qua lỗi API
            }

            if (ghnDetail == null || ghnDetail.getStatus() == null || ghnDetail.getStatus().isBlank()) {
                return;
            }

            String ghnStatusLower = ghnDetail.getStatus().toLowerCase().trim();
            OrderStatus newStatus = mapGhnStatusToOrderStatus(ghnStatusLower);
            
            if (newStatus != null && newStatus != currentStatus) {
                log.info("GHN sync: order {} status {} -> {}", orderId, currentStatus, newStatus);
                order.setStatus(newStatus);
                orderRepository.save(order);

                // Ghi nhận doanh thu cho đơn COD khi DELIVERED
                if (newStatus == OrderStatus.DELIVERED
                        && order.getPaymentMethod() == PaymentMethod.COD
                        && order.getPaymentStatus() == PaymentStatus.PAID
                        && Boolean.TRUE.equals(order.getPaid())) {
                    try {
                        Order reloadedOrder = orderRepository.findById(order.getId()).orElse(order);
                        financialService.ensureCodOrderRevenueRecorded(reloadedOrder);
                    } catch (Exception e) {
                        log.error("Error recording revenue for COD order {}", order.getId());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error syncing GHN status for order {}", orderId);
        }
    }

    // Map trạng thái GHN sang OrderStatus.
    private OrderStatus mapGhnStatusToOrderStatus(String ghnStatus) {
        if (ghnStatus == null || ghnStatus.isBlank()) {
            return null;
        }

        String status = ghnStatus.toLowerCase().trim();

        // storing, ready_to_pick → CONFIRMED (Chờ lấy hàng)
        if (status.equals("storing") || status.equals("ready_to_pick")) {
            return OrderStatus.CONFIRMED;
        }

        // delivering, money_collect_delivering → SHIPPED (Chờ giao hàng)
        if (status.equals("delivering") || status.equals("money_collect_delivering")) {
            return OrderStatus.SHIPPED;
        }

        // delivered, money_collected → DELIVERED (Đã giao)
        if (status.equals("delivered") || status.equals("money_collected")) {
            return OrderStatus.DELIVERED;
        }

        // return, returned, cancel, cancelled → không xử lý (tự quản lý)
        return null;
    }

    // ==================== GHN Request Building ====================

    private GhnCreateOrderRequest buildGhnCreateOrderRequest(Order order, List<Integer> pickShiftIds) {
        Address address = order.getAddress();
        validateAddress(address);

        // Tính toán các thông số cơ bản
        int totalWeight = calculateTotalWeight(order);
        int serviceTypeId = determineServiceType(totalWeight);
        Long codAmount = calculateCodAmount(order);
        Integer paymentTypeId = determinePaymentTypeId(order);

        // Build request với thông tin cơ bản
        var builder = buildBaseGhnRequest(order, address, codAmount, paymentTypeId, serviceTypeId, pickShiftIds);

        // Xử lý theo loại dịch vụ (light hoặc heavy)
        if (serviceTypeId == GhnConstants.SERVICE_TYPE_LIGHT) {
            applyLightServiceDimensions(builder, order);
        } else {
            applyHeavyServiceItems(builder, order);
        }

        return builder.build();
    }

    // Build phần cơ bản của GHN request (không bao gồm dimensions/items).
    private GhnCreateOrderRequest.GhnCreateOrderRequestBuilder buildBaseGhnRequest(
            Order order, Address address, Long codAmount, Integer paymentTypeId,
            int serviceTypeId, List<Integer> pickShiftIds) {

        return GhnCreateOrderRequest.builder()
                .paymentTypeId(paymentTypeId)
                .requiredNote(GhnConstants.REQUIRED_NOTE)
                .returnPhone(GhnConstants.DEFAULT_FROM_PHONE)
                .clientOrderCode(order.getCode())
                .fromName(GhnConstants.DEFAULT_FROM_NAME)
                .fromPhone(GhnConstants.DEFAULT_FROM_PHONE)
                .fromAddress(GhnConstants.DEFAULT_FROM_ADDRESS)
                .fromWardCode(GhnConstants.DEFAULT_FROM_WARD_CODE)
                .fromDistrictId(GhnConstants.DEFAULT_FROM_DISTRICT_ID)
                .fromProvinceId(GhnConstants.DEFAULT_FROM_PROVINCE_ID)
                .toName(address.getRecipientName())
                .toPhone(address.getRecipientPhoneNumber())
                .toAddress(buildFullAddress(address))
                .toWardCode(address.getWardCode())
                .toDistrictId(parseInteger(address.getDistrictID()))
                .toProvinceId(parseInteger(address.getProvinceID()))
                .codAmount(codAmount)
                .content(GhnConstants.CONTENT)
                .codFailedAmount(0L)
                .pickStationId(null)
                .deliverStationId(null)
                .insuranceValue(codAmount)
                .serviceTypeId(serviceTypeId)
                .coupon(null)
                .pickupTime(Instant.now().getEpochSecond())
                .pickShift(pickShiftIds != null ? pickShiftIds : new ArrayList<>())
                .note(order.getNote());
    }

    // Áp dụng dimensions cho light service.
    private void applyLightServiceDimensions(
            GhnCreateOrderRequest.GhnCreateOrderRequestBuilder builder, Order order) {
        ParcelDimensions dims = calculateLightServiceDimensions(order);
        builder.length(dims.length)
                .width(dims.width)
                .height(dims.height)
                .weight(dims.weight);
    }

    // Áp dụng items cho heavy service.
    private void applyHeavyServiceItems(
            GhnCreateOrderRequest.GhnCreateOrderRequestBuilder builder, Order order) {
        List<GhnOrderItemRequest> items = buildHeavyServiceItems(order);
        builder.length(null)
                .width(null)
                .height(null)
                .weight(null)
                .items(items);
    }

    // ==================== Pick Shift Resolution ====================

    // Xử lý pick shift IDs. Nếu null hoặc empty, tự động chọn ca lấy hàng phù hợp.
    private List<Integer> resolvePickShiftIds(List<Integer> pickShiftIds) {
        if (pickShiftIds != null && !pickShiftIds.isEmpty()) {
            return pickShiftIds;
        }

        return selectBestPickShift();
    }

    // Tự động chọn ca lấy hàng tốt nhất dựa trên thời gian hiện tại.
    private List<Integer> selectBestPickShift() {
        try {
            List<GhnPickShiftResponse> shifts = ghnService.getPickShifts();
            if (shifts == null || shifts.isEmpty()) {
                return new ArrayList<>();
            }

            long now = Instant.now().getEpochSecond();
            Integer shiftId = shifts.stream()
                    .filter(shift -> shift.getFromTime() != null && shift.getFromTime() >= now)
                    .map(GhnPickShiftResponse::getId)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElseGet(() -> shifts.get(0).getId());

            return shiftId != null ? List.of(shiftId) : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    // ==================== Calculation Helpers ====================

    // Tính tổng khối lượng đơn hàng (gram).
    private int calculateTotalWeight(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return 0;
        }

        return order.getItems().stream()
                .mapToInt(this::calculateItemWeight)
                .sum();
    }

    // Tính khối lượng của một order item (gram).
    private int calculateItemWeight(OrderItem item) {
        Product product = item.getProduct();
        if (product == null) {
            return 0;
        }

        GhnMapper.ProductDimensions dims = ghnMapper.getProductDimensions(product);
        int quantity = item.getQuantity() != null ? item.getQuantity() : 1;
        return dims.weight * quantity;
    }

    // Xác định loại dịch vụ (light hoặc heavy) dựa trên tổng khối lượng.
    private int determineServiceType(int totalWeightGrams) {
        return totalWeightGrams >= GhnConstants.HEAVY_SERVICE_WEIGHT_THRESHOLD
                ? GhnConstants.SERVICE_TYPE_HEAVY
                : GhnConstants.SERVICE_TYPE_LIGHT;
    }

    // Tính số tiền COD cần thu.
    // - Momo (đã thanh toán): 0
    // - COD (chưa thanh toán): totalAmount
    private Long calculateCodAmount(Order order) {
        if (isPaidViaMomo(order)) {
            return 0L;
        }

        if (order.getTotalAmount() == null) {
            return 0L;
        }
        return Math.round(order.getTotalAmount());
    }

    // Kiểm tra đơn hàng đã thanh toán qua Momo chưa.
    private boolean isPaidViaMomo(Order order) {
        return order.getPaymentMethod() == PaymentMethod.MOMO
                && order.getPaymentStatus() == PaymentStatus.PAID;
    }

    // Xác định paymentTypeId cho GHN.
    // 1 = sender (Momo - đã thanh toán trước)
    // 2 = receiver (COD - trả khi nhận hàng)
    private Integer determinePaymentTypeId(Order order) {
        return order.getPaymentMethod() == PaymentMethod.MOMO ? 1 : 2;
    }

    // ==================== Dimension Calculation ====================

    // Tính kích thước cho light service (tổng hợp từ tất cả items).
    private ParcelDimensions calculateLightServiceDimensions(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return createDefaultDimensions();
        }

        int maxLength = GhnConstants.DEFAULT_DIMENSION;
        int maxWidth = GhnConstants.DEFAULT_DIMENSION;
        int sumHeight = 0;
        int totalWeight = 0;

        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            if (product == null) continue;

            int quantity = item.getQuantity() != null ? item.getQuantity() : 1;
            GhnMapper.ProductDimensions dims = ghnMapper.getProductDimensions(product);

            maxLength = Math.max(maxLength, dims.length);
            maxWidth = Math.max(maxWidth, dims.width);
            sumHeight += dims.height * quantity;
            totalWeight += dims.weight * quantity;
        }

        return new ParcelDimensions(
                maxLength,
                maxWidth,
                Math.max(sumHeight, GhnConstants.DEFAULT_DIMENSION),
                Math.max(totalWeight, GhnConstants.DEFAULT_WEIGHT)
        );
    }

    // Build danh sách items cho heavy service.
    private List<GhnOrderItemRequest> buildHeavyServiceItems(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return new ArrayList<>();
        }

        return order.getItems().stream()
                .map(ghnMapper::toGhnOrderItem)
                .collect(Collectors.toList());
    }


    // Tạo dimensions mặc định cho parcel.
    private ParcelDimensions createDefaultDimensions() {
        return new ParcelDimensions(
                GhnConstants.DEFAULT_DIMENSION,
                GhnConstants.DEFAULT_DIMENSION,
                GhnConstants.DEFAULT_DIMENSION,
                GhnConstants.DEFAULT_WEIGHT
        );
    }

    // ==================== Address & Validation ====================

    // Build địa chỉ đầy đủ từ Address entity.
    private String buildFullAddress(Address address) {
        StringBuilder sb = new StringBuilder();
        appendIfNotBlank(sb, address.getAddress());
        appendIfNotBlank(sb, address.getWardName());
        appendIfNotBlank(sb, address.getDistrictName());
        appendIfNotBlank(sb, address.getProvinceName());
        appendIfNotBlank(sb, address.getCountry());
        return sb.toString();
    }

    // Append string vào StringBuilder nếu không blank.
    private void appendIfNotBlank(StringBuilder sb, String value) {
        if (value != null && !value.isBlank()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(value);
        }
    }

    // Parse string thành Integer, trả về null nếu không hợp lệ.
    private Integer parseInteger(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // Validate order có address và trả về order nếu hợp lệ.
    private Order validateOrderWithAddress(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED,
                        "Không tìm thấy đơn hàng: " + orderId));

        if (order.getAddress() == null) {
            throw new AppException(ErrorCode.ADDRESS_NOT_EXISTED,
                    "Đơn hàng không có địa chỉ giao hàng");
        }

        return order;
    }

    // Validate address có đủ thông tin cần thiết.
    private void validateAddress(Address address) {
        if (address == null) {
            throw new AppException(ErrorCode.ADDRESS_NOT_EXISTED, "Address không được null");
        }
    }

    // Đảm bảo đơn hàng chưa có shipment.
    private void ensureNoExistingShipment(String orderId) {
        shipmentRepository.findByOrderId(orderId)
                .ifPresent(existing -> {
                    throw new AppException(ErrorCode.BAD_REQUEST,
                            "Đơn hàng đã có vận đơn GHN");
                });
    }

    // ==================== Shipment Building ====================

    // Build Shipment entity từ GHN response data.
    private Shipment buildShipmentFromGhnData(Order order, GhnShipmentDataResponse ghnData) {
        return Shipment.builder()
                .order(order)
                .provider(ShipmentProvider.GHN)
                .status(ShipmentStatus.CREATED)
                .orderCode(ghnData.getOrder_code())
                .totalFee(ghnData.getTotal_fee())
                .build();
    }

    // ==================== Helper Classes ====================

    // Kích thước bưu kiện (light service).
    private static class ParcelDimensions {
        final int length, width, height, weight;

        ParcelDimensions(int length, int width, int height, int weight) {
            this.length = length;
            this.width = width;
            this.height = height;
            this.weight = weight;
        }
    }
}