package com.nova_beauty.backend.service;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nova_beauty.backend.configuration.GhnProperties;
import com.nova_beauty.backend.dto.request.CreateGhnShipmentRequest;
import com.nova_beauty.backend.dto.response.GhnShipmentFee;
import com.nova_beauty.backend.dto.response.GhnShipmentResponse;
import com.nova_beauty.backend.entity.Order;
import com.nova_beauty.backend.entity.Shipment;
import com.nova_beauty.backend.enums.OrderStatus;
import com.nova_beauty.backend.enums.ShipmentProvider;
import com.nova_beauty.backend.enums.ShipmentStatus;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.repository.OrderRepository;
import com.nova_beauty.backend.repository.ShipmentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipmentService {
    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final GhnProperties ghnProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Shipment createGhnOrder(CreateGhnShipmentRequest req) {
        Order order =
                orderRepository
                        .findById(req.getOrderId())
                        .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED));

        // Prepare GHN request payload
        Map<String, Object> payload = new HashMap<>();
        payload.put("payment_type_id", req.getPayment_type_id());
        payload.put("required_note", req.getRequired_note());
        payload.put("service_type_id", req.getService_type_id());
        payload.put("note", req.getNote());

        // sender
        if (req.getFrom_name() != null) payload.put("from_name", req.getFrom_name());
        if (req.getFrom_phone() != null) payload.put("from_phone", req.getFrom_phone());
        if (req.getFrom_address() != null) payload.put("from_address", req.getFrom_address());
        if (req.getFrom_ward_name() != null) payload.put("from_ward_name", req.getFrom_ward_name());
        if (req.getFrom_district_name() != null)
            payload.put("from_district_name", req.getFrom_district_name());
        if (req.getFrom_province_name() != null)
            payload.put("from_province_name", req.getFrom_province_name());

        // receiver
        payload.put("to_name", req.getTo_name());
        payload.put("to_phone", req.getTo_phone());
        payload.put("to_address", req.getTo_address());
        payload.put("to_ward_name", req.getTo_ward_name());
        payload.put("to_district_name", req.getTo_district_name());
        payload.put("to_province_name", req.getTo_province_name());

        // parcel
        payload.put("length", req.getLength());
        payload.put("width", req.getWidth());
        payload.put("height", req.getHeight());
        payload.put("weight", req.getWeight());
        payload.put("cod_amount", req.getCod_amount());

        if (req.getItems() != null && !req.getItems().isEmpty()) {
            payload.put("items", req.getItems());
        }

        // Call GHN API
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add("ShopId", String.valueOf(ghnProperties.getShopId()));
        headers.add("Token", ghnProperties.getToken());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        String url =
                ghnProperties.getBaseUrl()
                        + "/shiip/public-api/v2/shipping-order/create";

        ResponseEntity<GhnShipmentResponse> response =
                restTemplate.exchange(url, HttpMethod.POST, entity, GhnShipmentResponse.class);

        GhnShipmentResponse body = response.getBody();
        if (body == null
                || body.getCode() == null
                || body.getCode() != 200
                || body.getData() == null) {
            throw new AppException(ErrorCode.EXTERNAL_SERVICE_ERROR);
        }

        // Persist shipment
        Shipment shipment =
                Shipment.builder()
                        .order(order)
                        .provider(ShipmentProvider.GHN)
                        .status(ShipmentStatus.CREATED)
                        .orderCode(body.getData().getOrder_code())
                        .sortCode(body.getData().getSort_code())
                        .transType(body.getData().getTrans_type())
                        .wardEncode(body.getData().getWard_encode())
                        .districtEncode(body.getData().getDistrict_encode())
                        .feeMainService(getLongSafe(body.getData().getFee(), "main_service"))
                        .feeInsurance(getLongSafe(body.getData().getFee(), "insurance"))
                        .feeStationDo(getLongSafe(body.getData().getFee(), "station_do"))
                        .feeStationPu(getLongSafe(body.getData().getFee(), "station_pu"))
                        .feeReturn(getLongSafe(body.getData().getFee(), "return"))
                        .feeR2s(getLongSafe(body.getData().getFee(), "r2s"))
                        .feeCoupon(getLongSafe(body.getData().getFee(), "coupon"))
                        .feeCodFailedFee(
                                getLongSafe(body.getData().getFee(), "cod_failed_fee"))
                        .totalFee(body.getData().getTotal_fee())
                        .expectedDeliveryTime(
                                parseDateTime(body.getData().getExpected_delivery_time()))
                        .build();

        shipmentRepository.save(shipment);
        return shipment;
    }

    public void syncOrderStatusFromGhn(String orderId) {
        try {
            Order order =
                    orderRepository
                            .findById(orderId)
                            .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_EXISTED));
            if (order.getShipment() == null
                    || order.getShipment().getOrderCode() == null) {
                return;
            }

            // Ở NovaBeauty hiện chưa có API GHN get order detail, bạn có thể bổ sung tương tự
            // NovaBeauty.
            // Ở đây ta chỉ log lại để không phá luồng.
            log.debug(
                    "syncOrderStatusFromGhn is not fully implemented for order {}. Shipment code: {}",
                    orderId,
                    order.getShipment().getOrderCode());
        } catch (Exception e) {
            log.error("Lỗi khi đồng bộ trạng thái từ GHN cho order: {}", orderId, e);
        }
    }

    // Ước lượng phí trả hàng (có thể thay bằng logic thực tế nếu cần)
    public double estimateReturnShippingFee(Order order) {
        if (order == null || order.getShippingFee() == null) {
            return 0.0;
        }
        // Tạm lấy lại đúng phí ship ban đầu làm phí trả hàng
        return order.getShippingFee();
    }

    private Long getLongSafe(GhnShipmentFee fee, String field) {
        if (fee == null) return null;
        JsonNode node = objectMapper.valueToTree(fee).get(field);
        return node != null && node.isNumber() ? node.longValue() : null;
    }

    private OffsetDateTime parseDateTime(String iso) {
        if (iso == null) return null;
        try {
            return OffsetDateTime.parse(iso);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
