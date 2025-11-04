package com.nova_beauty.backend.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;

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
            requestBody.put("sender", Map.of("email", senderEmail, "name", "LuminaBook"));
            requestBody.put("to", new Object[] {Map.of("email", toEmail, "name", "User")});
            requestBody.put("subject", "Mã xác thực OTP - LuminaBook");

            String emailContent = String.format(
                    "Xin chào,\n\n"
                            + "Mã xác thực (OTP) của bạn là: %s\n\n"
                            + "Vui lòng sử dụng mã này để hoàn tất quá trình xác minh. "
                            + "Mã OTP có hiệu lực trong vòng 5 phút kể từ khi nhận được email này.\n\n"
                            + "Lưu ý: Tuyệt đối không chia sẻ mã OTP với bất kỳ ai để đảm bảo an toàn cho tài khoản của bạn.\n\n"
                            + "Trân trọng,\n"
                            + "Đội ngũ NovaBeauty ",
                    otpCode
            );


            requestBody.put("textContent", emailContent);
            requestBody.put("htmlContent", emailContent.replace("\n", "<br>"));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Send request
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
            requestBody.put("sender", Map.of("email", senderEmail, "name", "LuminaBook Admin"));
            requestBody.put("to", new Object[] {Map.of("email", toEmail, "name", staffName)});
            requestBody.put("subject", "Thông tin tài khoản nhân viên - NovaBeauty");

            String emailContent = String.format(
                    "Xin chào %s,\n\n"
                            + "Chào mừng bạn gia nhập đội ngũ NovaBeauty!\n\n"
                            + "Thông tin tài khoản của bạn như sau:\n"
                            + "- Email: %s\n"
                            + "- Mật khẩu tạm thời: %s\n"
                            + "- Vai trò: %s\n\n"
                            + "Vui lòng đăng nhập và đổi mật khẩu ngay trong lần đăng nhập đầu tiên để đảm bảo an toàn cho tài khoản.\n"
                            + "Trang đăng nhập: http://localhost:3000\n\n"
                            + "Lưu ý: Tuyệt đối không chia sẻ thông tin tài khoản này với bất kỳ ai.\n\n"
                            + "Trân trọng,\n"
                            + "Đội ngũ hỗ trợ NovaBeauty",
                    staffName, toEmail, password, role
            );


            requestBody.put("textContent", emailContent);
            requestBody.put("htmlContent", emailContent.replace("\n", "<br>"));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Send request
            ResponseEntity<Map> response = restTemplate.postForEntity(BREVO_API_URL, request, Map.class);

            if (response.getStatusCode() == HttpStatus.CREATED) {
                log.info("Staff password email sent successfully to: {} via Brevo API", toEmail);
            } else {
                log.error("Failed to send staff password email via Brevo API. Status: {}", response.getStatusCode());
                throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
            }

        } catch (Exception e) {
            log.error("Failed to send staff password email via Brevo API to: {} - Error: {}", toEmail, e.getMessage(), e);
            throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }
}
