package com.nova_beauty.backend.service;

import com.nova_beauty.backend.client.MomoApi;
import com.nova_beauty.backend.dto.request.CreateMomoRequest;
import com.nova_beauty.backend.dto.request.MomoIpnRequest;
import com.nova_beauty.backend.dto.response.CreateMomoResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MomoService {

    // Các giá trị cấu hình được lấy từ application.yaml (mục momo.*)
    @Value("${momo.partner-code}")
    private String PARTNER_CODE;

    @Value("${momo.access-key}")
    private String ACCESS_KEY;

    @Value("${momo.secret-key}")
    private String SECRET_KEY;

    @Value("${momo.return-url}")
    private String REDIRECT_URL;

    @Value("${momo.ipn-url}")
    private String IPN_URL;

    // requestType mặc định được cấu hình trong application.yaml (thường là "captureWallet")
    @Value("${momo.request-type}")
    private String REQUEST_TYPE;

    private final MomoApi momoApi;

    /**
     * Tạo giao dịch thanh toán MoMo và nhận về thông tin QR / payUrl.
     *
     * @param amount  số tiền cần thanh toán (VND)
     * @param orderId mã đơn hàng trong hệ thống của bạn (nếu null/blank sẽ tự sinh)
     */
    public CreateMomoResponse createMomoPayment(long amount, String orderId) {
        String safeOrderId =
                (orderId == null || orderId.isBlank()) ? UUID.randomUUID().toString() : orderId;
        String orderInfo = "Thanh toán đơn hàng: " + safeOrderId;
        String requestId = UUID.randomUUID().toString();
        String extraData = ""; // có thể encode base64 JSON nếu muốn truyền thêm thông tin

        // Raw signature theo đúng format tài liệu MoMo (key name a-z)
        String rawSignature =
                "accessKey=" + ACCESS_KEY +
                        "&amount=" + amount +
                        "&extraData=" + extraData +
                        "&ipnUrl=" + IPN_URL +
                        "&orderId=" + safeOrderId +
                        "&orderInfo=" + orderInfo +
                        "&partnerCode=" + PARTNER_CODE +
                        "&redirectUrl=" + REDIRECT_URL +
                        "&requestId=" + requestId +
                        "&requestType=" + REQUEST_TYPE;

        String signature = hmacSHA256(rawSignature, SECRET_KEY);
        log.info("MoMo rawSignature: {}", rawSignature);
        log.info("MoMo signature: {}", signature);

        CreateMomoRequest request = CreateMomoRequest.builder()
                .partnerCode(PARTNER_CODE)
                .requestType(REQUEST_TYPE)
                .ipnUrl(IPN_URL)
                .orderId(safeOrderId)
                .amount(amount)
                .orderInfo(orderInfo)
                .requestId(requestId)
                .redirectUrl(REDIRECT_URL)
                .lang("vi")
                .extraData(extraData)
                .signature(signature)
                .build();

        log.info("Sending create MoMo payment request: {}", request);
        CreateMomoResponse response = momoApi.createMomoQR(request);
        log.info("Received create MoMo payment response: {}", response);
        return response;
    }

    public boolean validateIpnSignature(MomoIpnRequest request) {
        if (request == null || request.getSignature() == null) {
            return false;
        }
        String rawSignature =
                "accessKey=" + ACCESS_KEY
                        + "&amount=" + safeValue(request.getAmount())
                        + "&extraData=" + safeValue(request.getExtraData())
                        + "&message=" + safeValue(request.getMessage())
                        + "&orderId=" + safeValue(request.getOrderId())
                        + "&orderInfo=" + safeValue(request.getOrderInfo())
                        + "&orderType=" + safeValue(request.getOrderType())
                        + "&partnerCode=" + safeValue(request.getPartnerCode())
                        + "&payType=" + safeValue(request.getPayType())
                        + "&requestId=" + safeValue(request.getRequestId())
                        + "&responseTime=" + safeValue(request.getResponseTime())
                        + "&resultCode=" + safeValue(request.getResultCode())
                        + "&transId=" + safeValue(request.getTransId());
        String expectedSignature = hmacSHA256(rawSignature, SECRET_KEY);
        return expectedSignature.equals(request.getSignature());
    }

    private String safeValue(Object value) {
        return value == null ? "" : value.toString();
    }

    // Tính chữ ký HMAC-SHA256 dạng hex lowercase theo yêu cầu của MoMo.
    private String hmacSHA256(String data, String secretKey) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec =
                    new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hex = new StringBuilder(2 * rawHmac.length);
            for (byte b : rawHmac) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1) hex.append('0');
                hex.append(h);
            }
            return hex.toString();
        } catch (Exception e) {
            log.error("Error while calculating MoMo HMAC-SHA256 signature", e);
            throw new RuntimeException("Cannot calculate MoMo signature", e);
        }
    }
}

