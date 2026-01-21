package com.hanoi_metro.backend.service;

import java.text.NumberFormat;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.hanoi_metro.backend.exception.AppException;
import com.hanoi_metro.backend.exception.ErrorCode;
import com.hanoi_metro.backend.entity.Order;
import com.hanoi_metro.backend.entity.OrderItem;

import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class BrevoEmailService {

    RestTemplate restTemplate = new RestTemplate();
    String apiKey;
    String senderEmail;

    public BrevoEmailService(
            @Value("${brevo.api.key}") String apiKey, @Value("${brevo.sender.email}") String senderEmail) {
        this.apiKey = apiKey;
        this.senderEmail = senderEmail;
    }

    private static final String BREVO_API_URL =
            "https://api.brevo.com/v3/smtp/email"; // correct Brevo transactional email endpoint

    public void sendOtpEmail(String toEmail, String otpCode) {
        try {
            log.info("Sending OTP email via Brevo API to: {}", toEmail);
            log.info("OTP Code for {}: {}", toEmail, otpCode);

            // Prepare headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            // Prepare request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sender", Map.of("email", senderEmail, "name", "NovaBeauty"));
            requestBody.put("to", new Object[] {Map.of("email", toEmail, "name", "User")});
            requestBody.put("subject", "Mã xác thực OTP - NovaBeauty");

            String emailContent = String.format(
                    "Xin chào,\n\n" + "Mã xác thực OTP của bạn là: %s\n\n"
                            + "Mã này có hiệu lực trong 5 phút.\n"
                            + "Vui lòng không chia sẻ mã này với bất kỳ ai.\n\n"
                            + "Trân trọng,\n"
                            + "Đội ngũ NovaBeauty",
                    otpCode);

            requestBody.put("textContent", emailContent);
            requestBody.put("htmlContent", emailContent.replace("\n", "<br>"));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Send request
            @SuppressWarnings("rawtypes")
            ResponseEntity<Map> response = restTemplate.postForEntity(BREVO_API_URL, request, Map.class);

            if (response.getStatusCode() == HttpStatus.CREATED) {
                log.info("Email sent successfully to: {} via Brevo API", toEmail);
            } else {
                log.error("Failed to send email via Brevo API. Status: {}", response.getStatusCode());
                throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
            }

        } catch (Exception e) {
            log.error("Failed to send email via Brevo API to: {} - Error: {}", toEmail, e.getMessage(), e);
            throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    public void sendStaffPasswordEmail(String toEmail, String staffName, String password, String role) {
        try {
            log.info("Sending staff password email via Brevo API to: {}", toEmail);

            // Prepare headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            // Prepare request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sender", Map.of("email", senderEmail, "name", "NovaBeauty Admin"));
            requestBody.put("to", new Object[] {Map.of("email", toEmail, "name", staffName)});
            requestBody.put("subject", "Thông tin tài khoản nhân viên - NovaBeauty");

            String emailContent = String.format(
                    "Xin chào %s,\n\n"
                            + "Chào mừng bạn đến với đội ngũ NovaBeauty!\n\n"
                            + "Thông tin tài khoản của bạn:\n"
                            + "- Email: %s\n"
                            + "- Mật khẩu: %s\n"
                            + "- Vai trò: %s\n\n"
                            + "Vui lòng đăng nhập và thay đổi mật khẩu ngay lần đầu tiên để bảo mật tài khoản.\n"
                            + "Địa chỉ đăng nhập: http://localhost:3000\n\n"
                            + "Lưu ý: Vui lòng không chia sẻ thông tin này với bất kỳ ai.\n\n"
                            + "Trân trọng,\n"
                            + "Đội ngũ NovaBeauty",
                    staffName, toEmail, password, role);

            requestBody.put("textContent", emailContent);
            requestBody.put("htmlContent", emailContent.replace("\n", "<br>"));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Send request
            @SuppressWarnings("rawtypes")
            ResponseEntity<Map> response = restTemplate.postForEntity(BREVO_API_URL, request, Map.class);

            if (response.getStatusCode() == HttpStatus.CREATED) {
                log.info("Staff password email sent successfully to: {} via Brevo API", toEmail);
            } else {
                log.error("Failed to send staff password email via Brevo API. Status: {}", response.getStatusCode());
                throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
            }

        } catch (Exception e) {
            log.error(
                    "Failed to send staff password email via Brevo API to: {} - Error: {}", toEmail, e.getMessage(), e);
            throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    public void sendAccountLockedEmail(String toEmail, String userName, String roleName) {
        try {
            log.info("Sending account locked notification email via Brevo API to: {}", toEmail);

            // Prepare headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            // Prepare request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sender", Map.of("email", senderEmail, "name", "NovaBeauty Admin"));
            requestBody.put("to", new Object[] {Map.of("email", toEmail, "name", userName != null ? userName : "User")});
            requestBody.put("subject", "Thông báo: Tài khoản của bạn đã bị khóa - NovaBeauty");

            String roleDisplayName = "Khách hàng";
            if (roleName != null) {
                switch (roleName.toUpperCase()) {
                    case "STAFF":
                        roleDisplayName = "Nhân viên";
                        break;
                    case "CUSTOMER_SUPPORT":
                        roleDisplayName = "Nhân viên chăm sóc khách hàng";
                        break;
                    case "CUSTOMER":
                    default:
                        roleDisplayName = "Khách hàng";
                        break;
                }
            }

            String emailContent = String.format(
                    "Xin chào %s,\n\n"
                            + "Chúng tôi xin thông báo rằng tài khoản %s của bạn tại NovaBeauty đã bị khóa.\n\n"
                            + "Thông tin tài khoản:\n"
                            + "- Email: %s\n"
                            + "- Vai trò: %s\n\n"
                            + "Khi tài khoản bị khóa, bạn sẽ không thể đăng nhập vào hệ thống.\n\n"
                            + "Nếu bạn cho rằng đây là sự nhầm lẫn hoặc cần được hỗ trợ, vui lòng liên hệ với chúng tôi:\n"
                            + "- Email hỗ trợ: %s\n"
                            + "- Hoặc liên hệ qua hotline:  \n\n"
                            + "Chúng tôi sẽ xem xét và phản hồi yêu cầu của bạn trong thời gian sớm nhất.\n\n"
                            + "Trân trọng,\n"
                            + "Đội ngũ NovaBeauty",
                    userName != null ? userName : "Quý khách", roleDisplayName, toEmail, roleDisplayName, senderEmail);

            requestBody.put("textContent", emailContent);
            requestBody.put("htmlContent", emailContent.replace("\n", "<br>"));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Send request
            @SuppressWarnings("rawtypes")
            ResponseEntity<Map> response = restTemplate.postForEntity(BREVO_API_URL, request, Map.class);

            if (response.getStatusCode() == HttpStatus.CREATED) {
                log.info("Account locked notification email sent successfully to: {} via Brevo API", toEmail);
            } else {
                log.error("Failed to send account locked email via Brevo API. Status: {}", response.getStatusCode());
                throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
            }

        } catch (Exception e) {
            log.error(
                    "Failed to send account locked email via Brevo API to: {} - Error: {}", toEmail, e.getMessage(), e);
            // Don't throw exception here - account lock should succeed even if email fails
            // Just log the error
        }
    }

    public void sendProfileUpdatedEmail(String toEmail, String userName, String roleName) {
        if (toEmail == null || toEmail.isBlank()) {
            return;
        }

        try {
            log.info("Sending profile updated notification email via Brevo API to: {}", toEmail);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            String roleDisplayName = "Người dùng";
            if (roleName != null) {
                switch (roleName.toUpperCase()) {
                    case "STAFF":
                        roleDisplayName = "Nhân viên";
                        break;
                    case "CUSTOMER_SUPPORT":
                        roleDisplayName = "Nhân viên chăm sóc khách hàng";
                        break;
                    case "CUSTOMER":
                        roleDisplayName = "Khách hàng";
                        break;
                    default:
                        roleDisplayName = "Người dùng";
                }
            }

            String emailContent = String.format(
                    "Xin chào %s,\n\n"
                            + "Thông tin tài khoản %s của bạn tại NovaBeauty vừa được quản trị viên cập nhật.\n"
                            + "Nếu bạn không yêu cầu thay đổi này, vui lòng liên hệ với chúng tôi để được hỗ trợ.\n\n"
                            + "Trân trọng,\n"
                            + "Đội ngũ NovaBeauty",
                    userName != null && !userName.isBlank() ? userName : "Quý khách",
                    roleDisplayName);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sender", Map.of("email", senderEmail, "name", "NovaBeauty Admin"));
            requestBody.put("to", new Object[] {Map.of("email", toEmail, "name", userName != null ? userName : "User")});
            requestBody.put("subject", "Thông báo cập nhật tài khoản - NovaBeauty");
            requestBody.put("textContent", emailContent);
            requestBody.put("htmlContent", emailContent.replace("\n", "<br>"));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            @SuppressWarnings("rawtypes")
            ResponseEntity<Map> response = restTemplate.postForEntity(BREVO_API_URL, request, Map.class);

            if (response.getStatusCode() == HttpStatus.CREATED) {
                log.info("Profile updated notification email sent to {}", toEmail);
            } else {
                log.error("Failed to send profile updated email via Brevo API. Status: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error(
                    "Failed to send profile updated email via Brevo API to: {} - Error: {}",
                    toEmail,
                    e.getMessage(),
                    e);
        }
    }

    public void sendOrderConfirmationEmail(Order order) {
        if (order == null || order.getUser() == null || order.getUser().getEmail() == null) {
            return;
        }
        try {
            String toEmail = order.getUser().getEmail();
            String customerName = order.getUser().getFullName() != null
                    ? order.getUser().getFullName()
                    : "Quý khách";

            log.info("Sending order confirmation email to {}", toEmail);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));

            StringBuilder itemsBuilder = new StringBuilder();
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    String name = item.getProduct() != null ? item.getProduct().getName() : "Sản phẩm";
                    itemsBuilder.append("- ")
                            .append(name)
                            .append(" x")
                            .append(item.getQuantity())
                            .append(" : ")
                            .append(currencyFormat.format(item.getFinalPrice()))
                            .append("\n");
                }
            }

            String content = String.format(
                    "Xin chào %s,\n\n"
                            + "Cảm ơn bạn đã đặt hàng tại NovaBeauty. Đơn hàng %s của bạn đã được ghi nhận.\n\n"
                            + "Tổng tiền: %s\n"
                            + "Phí vận chuyển: %s\n"
                            + "Phương thức thanh toán: %s\n\n"
                            + "Chi tiết sản phẩm:\n%s\n"
                            + "Địa chỉ giao hàng: %s\n\n"
                            + "Chúng tôi sẽ liên hệ khi đơn hàng được giao cho đơn vị vận chuyển.\n\n"
                            + "Trân trọng,\nĐội ngũ NovaBeauty",
                    customerName,
                    order.getCode(),
                    currencyFormat.format(order.getTotalAmount()),
                    currencyFormat.format(order.getShippingFee() != null ? order.getShippingFee() : 0),
                    order.getPaymentMethod() != null ? order.getPaymentMethod().name() : "Không xác định",
                    itemsBuilder.toString(),
                    order.getShippingAddress());

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sender", Map.of("email", senderEmail, "name", "NovaBeauty"));
            requestBody.put("to", new Object[] {Map.of("email", toEmail, "name", customerName)});
            requestBody.put("subject", "Xác nhận đơn hàng " + order.getCode());
            requestBody.put("textContent", content);
            requestBody.put("htmlContent", content.replace("\n", "<br>"));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            @SuppressWarnings("rawtypes")
            ResponseEntity<Map> response = restTemplate.postForEntity(BREVO_API_URL, request, Map.class);

            if (response.getStatusCode() == HttpStatus.CREATED) {
                log.info("Order confirmation email sent to {}", toEmail);
            } else {
                log.warn("Failed to send order confirmation email. Status {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to send order confirmation email", e);
        }
    }

    // ===== Stub methods for return/refund flow (ported from NovaBeauty, simplified) =====

    public void sendReturnRejectedEmail(Order order) {
        if (order == null || order.getUser() == null || order.getUser().getEmail() == null) {
            return;
        }
        log.info("sendReturnRejectedEmail stub called for order {}", order.getId());
        // Bạn có thể triển khai gửi email chi tiết sau nếu muốn
    }

    public void sendReturnCsConfirmedEmail(Order order) {
        if (order == null || order.getUser() == null || order.getUser().getEmail() == null) {
            return;
        }
        log.info("sendReturnCsConfirmedEmail stub called for order {}", order.getId());
    }

    public void sendReturnStaffInspectionEmail(Order order) {
        if (order == null || order.getUser() == null || order.getUser().getEmail() == null) {
            return;
        }
        log.info("sendReturnStaffInspectionEmail stub called for order {}", order.getId());
    }
}
