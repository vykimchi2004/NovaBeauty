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
     * Lưu file media của product vào thư mục product_media/
     * @param file File cần lưu
     * @return URL của file đã lưu
     */
    public String storeProductMedia(MultipartFile file) {
        return storeFile(file, PRODUCT_MEDIA_DIR, "/product_media/");
    }

    /**
     * Lưu file media của voucher vào thư mục vouchers/
     * @param file File cần lưu
     * @return URL của file đã lưu
     */
    public String storeVoucherMedia(MultipartFile file) {
        return storeFile(file, VOUCHER_MEDIA_DIR, VOUCHER_MEDIA_URL);
    }

    /**
     * Lưu file media của promotion vào thư mục promotions/
     * @param file File cần lưu
     * @return URL của file đã lưu
     */
    public String storePromotionMedia(MultipartFile file) {
        return storeFile(file, PROMOTION_MEDIA_DIR, PROMOTION_MEDIA_URL);
    }

    /**
     * Lưu file avatar/profile vào thư mục profile_media/
     * @param file File cần lưu
     * @return URL của file đã lưu
     */
    public String storeProfileMedia(MultipartFile file) {
        return storeFile(file, PROFILE_MEDIA_DIR, PROFILE_MEDIA_URL);
    }

    /**
     * Lưu file vào thư mục chỉ định
     * @param file File cần lưu
     * @param directory Thư mục đích
     * @param urlPath Đường dẫn URL để truy cập file
     * @return URL của file đã lưu
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
