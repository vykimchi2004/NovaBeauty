package com.nova_beauty.backend.service;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class FileStorageService {

    private static final String PRODUCT_MEDIA_DIR = "uploads/product_media";
    private static final String VOUCHER_MEDIA_DIR = "uploads/vouchers";
    private static final String PROMOTION_MEDIA_DIR = "uploads/promotions";
    private static final String PROFILE_MEDIA_DIR = "uploads/profile_media";
    private static final String VOUCHER_MEDIA_URL = "/voucher_media/";
    private static final String PROMOTION_MEDIA_URL = "/promotion_media/";
    private static final String PROFILE_MEDIA_URL = "/profile_media/";

    /**
     * LÆ°u file media cá»§a product vÃ o thÆ° má»¥c product_media/
     * @param file File cáº§n lÆ°u
     * @return URL cá»§a file Ä‘Ã£ lÆ°u
     */
    public String storeProductMedia(MultipartFile file) {
        return storeFile(file, PRODUCT_MEDIA_DIR, "/product_media/");
    }

    /**
     * LÆ°u file media cá»§a voucher vÃ o thÆ° má»¥c vouchers/
     * @param file File cáº§n lÆ°u
     * @return URL cá»§a file Ä‘Ã£ lÆ°u
     */
    public String storeVoucherMedia(MultipartFile file) {
        return storeFile(file, VOUCHER_MEDIA_DIR, VOUCHER_MEDIA_URL);
    }

    /**
     * LÆ°u file media cá»§a promotion vÃ o thÆ° má»¥c promotions/
     * @param file File cáº§n lÆ°u
     * @return URL cá»§a file Ä‘Ã£ lÆ°u
     */
    public String storePromotionMedia(MultipartFile file) {
        return storeFile(file, PROMOTION_MEDIA_DIR, PROMOTION_MEDIA_URL);
    }

    /**
     * LÆ°u file avatar/profile vÃ o thÆ° má»¥c profile_media/
     * @param file File cáº§n lÆ°u
     * @return URL cá»§a file Ä‘Ã£ lÆ°u
     */
    public String storeProfileMedia(MultipartFile file) {
        return storeFile(file, PROFILE_MEDIA_DIR, PROFILE_MEDIA_URL);
    }

    /**
     * LÆ°u file vÃ o thÆ° má»¥c chá»‰ Ä‘á»‹nh
     * @param file File cáº§n lÆ°u
     * @param directory ThÆ° má»¥c Ä‘Ã­ch
     * @param urlPath ÄÆ°á»ng dáº«n URL Ä‘á»ƒ truy cáº­p file
     * @return URL cá»§a file Ä‘Ã£ lÆ°u
     */
    private String storeFile(MultipartFile file, String directory, String urlPath) {
        try {
            String original = file.getOriginalFilename();
            String ext = "";
            if (original != null && original.contains(".")) {
                ext = original.substring(original.lastIndexOf('.'));
            }
            String filename = UUID.randomUUID() + ext;
            Path uploadPath = Paths.get(directory);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            Path target = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            String url = ServletUriComponentsBuilder
                    .fromCurrentContextPath()
                    .path(urlPath)
                    .path(filename)
                    .build()
                    .toUriString();
            log.debug("File stored successfully: {}", url);
            return url;
        } catch (IOException e) {
            log.error("Failed to store file: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }
    }
}


