package com.hanoi_metro.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hanoi_metro.backend.entity.ExpiredPromotion;
import com.hanoi_metro.backend.entity.ExpiredVoucher;
import com.hanoi_metro.backend.entity.Promotion;
import com.hanoi_metro.backend.entity.Voucher;
import com.hanoi_metro.backend.enums.PromotionStatus;
import com.hanoi_metro.backend.enums.VoucherStatus;
import com.hanoi_metro.backend.repository.ExpiredPromotionRepository;
import com.hanoi_metro.backend.repository.ExpiredVoucherRepository;
import com.hanoi_metro.backend.repository.PromotionRepository;
import com.hanoi_metro.backend.repository.VoucherRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpirationService {

    private final VoucherRepository voucherRepository;
    private final PromotionRepository promotionRepository;
    private final ExpiredVoucherRepository expiredVoucherRepository;
    private final ExpiredPromotionRepository expiredPromotionRepository;
    private final PromotionService promotionService;

    // Cháº¡y má»—i giá» Ä‘á»ƒ kiá»ƒm tra vÃ  chuyá»ƒn voucher/promotion háº¿t háº¡n vÃ o báº£ng háº¿t háº¡n
    // Cron expression: giÃ¢y phÃºt giá» ngÃ y thÃ¡ng thá»© (0 0 * * * * = má»—i giá»)
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void moveExpiredItems() {
        // log.info("Báº¯t Ä‘áº§u kiá»ƒm tra vÃ  chuyá»ƒn voucher/promotion háº¿t háº¡n...");
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        // Xá»­ lÃ½ promotions cáº§n activate (Ä‘Ã£ Ä‘áº¿n startDate)
        processPromotionsToActivate(today);

        // Xá»­ lÃ½ vouchers háº¿t háº¡n
        processExpiredVouchers(today, now);

        // Xá»­ lÃ½ promotions háº¿t háº¡n
        processExpiredPromotions(today, now);

        // log.info("HoÃ n táº¥t kiá»ƒm tra voucher/promotion háº¿t háº¡n");
    }

    // Xá»­ lÃ½ cÃ¡c promotion Ä‘Ã£ Ä‘áº¿n startDate - tá»± Ä‘á»™ng activate vÃ  apply vÃ o sáº£n pháº©m
    private void processPromotionsToActivate(LocalDate today) {
        List<Promotion> promotionsToActivate = promotionRepository.findPromotionsToActivate(today);

        for (Promotion promotion : promotionsToActivate) {
            try {
                // Activate promotion
                promotion.setIsActive(true);
                promotionRepository.save(promotion);

                // Apply promotion vÃ o cÃ¡c sáº£n pháº©m target
                promotionService.applyPromotionToTargets(promotion);

                log.info("ÄÃ£ tá»± Ä‘á»™ng kÃ­ch hoáº¡t vÃ  Ã¡p dá»¥ng promotion {} ({}) cho sáº£n pháº©m", promotion.getName(), promotion.getId());
            } catch (Exception e) {
                log.error("Lá»—i khi kÃ­ch hoáº¡t promotion {} ({}): {}", promotion.getName(), promotion.getId(), e.getMessage(), e);
            }
        }
    }

    private void processExpiredVouchers(LocalDate today, LocalDateTime now) {
        List<Voucher> expiredVouchers = voucherRepository.findExpiredVouchers(today, VoucherStatus.EXPIRED);

        for (Voucher voucher : expiredVouchers) {
            // Kiá»ƒm tra xem Ä‘Ã£ Ä‘Æ°á»£c lÆ°u vÃ o báº£ng háº¿t háº¡n chÆ°a
            if (!expiredVoucherRepository.existsById(voucher.getId())) {
                ExpiredVoucher expiredVoucher = ExpiredVoucher.builder()
                        .id(voucher.getId())
                        .code(voucher.getCode())
                        .name(voucher.getName())
                        .discountValueType(voucher.getDiscountValueType())
                        .applyScope(voucher.getApplyScope())
                        .minOrderValue(voucher.getMinOrderValue())
                        .maxOrderValue(voucher.getMaxOrderValue())
                        .discountValue(voucher.getDiscountValue())
                        .maxDiscountValue(voucher.getMaxDiscountValue())
                        .startDate(voucher.getStartDate())
                        .expiryDate(voucher.getExpiryDate())
                        .imageUrl(voucher.getImageUrl())
                        .description(voucher.getDescription())
                        .usageLimit(voucher.getUsageLimit())
                        .usageCount(voucher.getUsageCount())
                        .isActive(voucher.getIsActive())
                        .status(voucher.getStatus().name())
                        .submittedBy(voucher.getSubmittedBy() != null ? voucher.getSubmittedBy().getId() : null)
                        .approvedBy(voucher.getApprovedBy() != null ? voucher.getApprovedBy().getId() : null)
                        .submittedAt(voucher.getSubmittedAt())
                        .approvedAt(voucher.getApprovedAt())
                        .expiredAt(now)
                        .rejectionReason(voucher.getRejectionReason())
                        .build();

                expiredVoucherRepository.save(expiredVoucher);
                
                // Cập nhật status của voucher gốc thành EXPIRED
                voucher.setStatus(VoucherStatus.EXPIRED);
                voucherRepository.save(voucher);
                
                log.info("ÄÃ£ chuyá»ƒn voucher {} vÃ o báº£ng háº¿t háº¡n", voucher.getCode());
            }
        }
    }

    private void processExpiredPromotions(LocalDate today, LocalDateTime now) {
        List<Promotion> expiredPromotions = promotionRepository.findExpiredPromotions(today, PromotionStatus.EXPIRED);

        for (Promotion promotion : expiredPromotions) {
            // Kiá»ƒm tra xem Ä‘Ã£ Ä‘Æ°á»£c lÆ°u vÃ o báº£ng háº¿t háº¡n chÆ°a
            if (!expiredPromotionRepository.existsById(promotion.getId())) {
                ExpiredPromotion expiredPromotion = ExpiredPromotion.builder()
                        .id(promotion.getId())
                        .code(promotion.getCode())
                        .name(promotion.getName())
                        .imageUrl(promotion.getImageUrl())
                        .description(promotion.getDescription())
                        .discountValue(promotion.getDiscountValue())
                        .minOrderValue(promotion.getMinOrderValue())
                        .maxDiscountValue(promotion.getMaxDiscountValue())
                        .startDate(promotion.getStartDate())
                        .expiryDate(promotion.getExpiryDate())
                        .usageCount(promotion.getUsageCount())
                        .isActive(promotion.getIsActive())
                        .status(promotion.getStatus().name())
                        .submittedBy(promotion.getSubmittedBy() != null ? promotion.getSubmittedBy().getId() : null)
                        .approvedBy(promotion.getApprovedBy() != null ? promotion.getApprovedBy().getId() : null)
                        .submittedAt(promotion.getSubmittedAt())
                        .approvedAt(promotion.getApprovedAt())
                        .expiredAt(now)
                        .rejectionReason(promotion.getRejectionReason())
                        .build();

                expiredPromotionRepository.save(expiredPromotion);
                promotionService.detachPromotionFromProducts(promotion);
                
                // Cập nhật status của promotion gốc thành EXPIRED
                promotion.setStatus(PromotionStatus.EXPIRED);
                promotionRepository.save(promotion);
                
                log.info("ÄÃ£ chuyá»ƒn promotion {} ({}) vÃ o báº£ng háº¿t háº¡n", promotion.getName(), promotion.getId());
            }
        }
    }
}

