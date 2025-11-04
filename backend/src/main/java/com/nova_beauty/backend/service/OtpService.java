package com.nova_beauty.backend.service;

import java.time.LocalDateTime;
import java.util.Random;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.entity.Otp;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.repository.OtpRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class OtpService {

    OtpRepository otpRepository;
    BrevoEmailService brevoEmailService;

    private static final int OTP_LENGTH = 6;
    private static final long OTP_EXPIRATION_MINUTES = 5;

    @Transactional
    public String generateAndSendOtp(String email) {
        // Xóa các OTP cũ của email này
        otpRepository.deleteAllByEmail(email);

        String otpCode = generateOtpCode();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiryTime = now.plusMinutes(OTP_EXPIRATION_MINUTES);

        Otp otp = Otp.builder()
                .email(email)
                .code(otpCode)
                .createdAt(now)
                .expiresAt(expiryTime)
                .isUsed(false)
                .build();

        otpRepository.save(otp);
        sendOtpEmail(email, otpCode);
        return otpCode;
    }

    @Transactional(readOnly = true)
    public boolean isValidOtp(String email, String otpCode) {
        otpRepository
                .findByEmailAndCodeAndExpiresAtAfterAndIsUsedFalse(email, otpCode, LocalDateTime.now())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_OTP));
        return true;
    }

    @Transactional
    public void consumeOtp(String email, String otpCode) {
        otpRepository
                .findByEmailAndCodeAndExpiresAtAfterAndIsUsedFalse(email, otpCode, LocalDateTime.now())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_OTP));
        otpRepository.markOtpAsUsed(email, otpCode);
    }

    private String generateOtpCode() {
        Random random = new Random();
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < OTP_LENGTH; i++) {
            otp.append(random.nextInt(10));
        }
        return otp.toString();
    }

    private void sendOtpEmail(String email, String otpCode) {
        brevoEmailService.sendOtpEmail(email, otpCode);
    }
}
