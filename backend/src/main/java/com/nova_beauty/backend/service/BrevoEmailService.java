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
            requestBody.put("subject", "MÃ£ xÃ¡c thá»±c OTP - LuminaBook");

            String emailContent = String.format(
                    "Xin chÃ o,\n\n" + "MÃ£ xÃ¡c thá»±c OTP cá»§a báº¡n lÃ : %s\n\n"
                            + "MÃ£ nÃ y cÃ³ hiá»‡u lá»±c trong 5 phÃºt.\n"
                            + "Vui lÃ²ng khÃ´ng chia sáº» mÃ£ nÃ y vá»›i báº¥t ká»³ ai.\n\n"
                            + "TrÃ¢n trá»ng,\n"
                            + "Äá»™i ngÅ© LuminaBook",
                    otpCode);

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
            requestBody.put("subject", "ThÃ´ng tin tÃ i khoáº£n nhÃ¢n viÃªn - LuminaBook");

            String emailContent = String.format(
                    "Xin chÃ o %s,\n\n"
                            + "ChÃ o má»«ng báº¡n Ä‘áº¿n vá»›i Ä‘á»™i ngÅ© LuminaBook!\n\n"
                            + "ThÃ´ng tin tÃ i khoáº£n cá»§a báº¡n:\n"
                            + "- Email: %s\n"
                            + "- Máº­t kháº©u: %s\n"
                            + "- Vai trÃ²: %s\n\n"
                            + "Vui lÃ²ng Ä‘Äƒng nháº­p vÃ  thay Ä‘á»•i máº­t kháº©u ngay láº§n Ä‘áº§u tiÃªn Ä‘á»ƒ báº£o máº­t tÃ i khoáº£n.\n"
                            + "Äá»‹a chá»‰ Ä‘Äƒng nháº­p: http://localhost:3000\n\n"
                            + "LÆ°u Ã½: Vui lÃ²ng khÃ´ng chia sáº» thÃ´ng tin nÃ y vá»›i báº¥t ká»³ ai.\n\n"
                            + "TrÃ¢n trá»ng,\n"
                            + "Äá»™i ngÅ© LuminaBook",
                    staffName, toEmail, password, role);

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
            requestBody.put("sender", Map.of("email", senderEmail, "name", "LuminaBook Admin"));
            requestBody.put("to", new Object[] {Map.of("email", toEmail, "name", userName != null ? userName : "User")});
            requestBody.put("subject", "ThÃ´ng bÃ¡o: TÃ i khoáº£n cá»§a báº¡n Ä‘Ã£ bá»‹ khÃ³a - LuminaBook");

            String roleDisplayName = "KhÃ¡ch hÃ ng";
            if (roleName != null) {
                switch (roleName.toUpperCase()) {
                    case "STAFF":
                        roleDisplayName = "NhÃ¢n viÃªn";
                        break;
                    case "CUSTOMER_SUPPORT":
                        roleDisplayName = "NhÃ¢n viÃªn chÄƒm sÃ³c khÃ¡ch hÃ ng";
                        break;
                    case "CUSTOMER":
                    default:
                        roleDisplayName = "KhÃ¡ch hÃ ng";
                        break;
                }
            }

            String emailContent = String.format(
                    "Xin chÃ o %s,\n\n"
                            + "ChÃºng tÃ´i xin thÃ´ng bÃ¡o ráº±ng tÃ i khoáº£n %s cá»§a báº¡n táº¡i LuminaBook Ä‘Ã£ bá»‹ khÃ³a.\n\n"
                            + "ThÃ´ng tin tÃ i khoáº£n:\n"
                            + "- Email: %s\n"
                            + "- Vai trÃ²: %s\n\n"
                            + "Khi tÃ i khoáº£n bá»‹ khÃ³a, báº¡n sáº½ khÃ´ng thá»ƒ Ä‘Äƒng nháº­p vÃ o há»‡ thá»‘ng.\n\n"
                            + "Náº¿u báº¡n cho ráº±ng Ä‘Ã¢y lÃ  sá»± nháº§m láº«n hoáº·c cáº§n Ä‘Æ°á»£c há»— trá»£, vui lÃ²ng liÃªn há»‡ vá»›i chÃºng tÃ´i:\n"
                            + "- Email há»— trá»£: %s\n"
                            + "- Hoáº·c liÃªn há»‡ qua hotline:  \n\n"
                            + "ChÃºng tÃ´i sáº½ xem xÃ©t vÃ  pháº£n há»“i yÃªu cáº§u cá»§a báº¡n trong thá»i gian sá»›m nháº¥t.\n\n"
                            + "TrÃ¢n trá»ng,\n"
                            + "Äá»™i ngÅ© LuminaBook",
                    userName != null ? userName : "QuÃ½ khÃ¡ch", roleDisplayName, toEmail, roleDisplayName, senderEmail);

            requestBody.put("textContent", emailContent);
            requestBody.put("htmlContent", emailContent.replace("\n", "<br>"));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            // Send request
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
}
