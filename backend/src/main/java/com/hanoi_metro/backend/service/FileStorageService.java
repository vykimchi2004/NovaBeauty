package com.hanoi_metro.backend.service;


import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.hanoi_metro.backend.exception.AppException;
import com.hanoi_metro.backend.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class FileStorageService {

    private static final String PRODUCT_MEDIA_FOLDER = "product_media";
    private static final String VOUCHER_MEDIA_FOLDER = "voucher_media";
    private static final String PROMOTION_MEDIA_FOLDER = "promotion_media";
    private static final String PROFILE_MEDIA_FOLDER = "profile_media";
    private static final String BANNER_MEDIA_FOLDER = "banners";

    private final Cloudinary cloudinary;

    /**
     * Upload product/voucher/promotion/avatar media file to Cloudinary
     *
     * @param file File to upload
     * @return Cloudinary URL of the uploaded file
     */
    public String storeProductMedia(MultipartFile file) {
        return uploadToCloudinary(file, PRODUCT_MEDIA_FOLDER);
    }

    public String storeVoucherMedia(MultipartFile file) {
        return uploadToCloudinary(file, VOUCHER_MEDIA_FOLDER);
    }

    public String storePromotionMedia(MultipartFile file) {
        return uploadToCloudinary(file, PROMOTION_MEDIA_FOLDER);
    }

    public String storeProfileMedia(MultipartFile file) {
        return uploadToCloudinary(file, PROFILE_MEDIA_FOLDER);
    }

    public String storeBannerMedia(MultipartFile file) {
        return uploadToCloudinary(file, BANNER_MEDIA_FOLDER);
    }

    /**
     * Delete profile media/file media from Cloudinary
     *
     * @param url Cloudinary URL của file cần xóa
     */
    public void deleteProfileMedia(String url) {
        deleteFromCloudinary(url);
    }

    public void deleteFileFromCloudinary(String url) {
        deleteFromCloudinary(url);
    }

    /**
     * Upload file to Cloudinary
     *
     * @param file   File to upload
     * @param folder Cloudinary folder to store the file
     * @return Cloudinary URL of the uploaded file
     */
    private String uploadToCloudinary(MultipartFile file, String folder) {
        try {
            Map<String, Object> uploadParams = new HashMap<>();
            uploadParams.put("folder", folder);
            uploadParams.put("use_filename", false); // Cloudinary tự tạo tên file
            uploadParams.put("unique_filename", true); // Đảm bảo tên file unique
            uploadParams.put("overwrite", false); // Không ghi đè file cũ
            uploadParams.put("resource_type", "auto"); // Tự động detect image/video/raw

            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = (Map<String, Object>) cloudinary.uploader().upload(
                    file.getBytes(),
                    uploadParams);

            String url = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");
            log.info("File uploaded to Cloudinary. Folder: {}, Public ID: {}, URL: {}", folder, publicId, url);
            return url;

        } catch (IOException e) {
            log.error("Failed to upload file to Cloudinary: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }
    }

    /**
     * Delete file from Cloudinary
     *
     * @param url URL của file cần xóa (có thể là Cloudinary URL hoặc public_id)
     */
    private void deleteFromCloudinary(String url) {
        if (url == null || url.isBlank()) {
            return;
        }

        // Chỉ xử lý URL Cloudinary
        if (!url.contains("cloudinary.com")) {
            log.debug("URL is not a Cloudinary URL, skipping deletion: {}", url);
            return;
        }

        try {
            String publicId = extractPublicIdFromUrl(url);
            if (publicId == null || publicId.isBlank()) {
                log.warn("Could not extract public_id from Cloudinary URL: {}", url);
                return;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> deleteResult = (Map<String, Object>) cloudinary.uploader().destroy(publicId,
                    ObjectUtils.emptyMap());
            String result = (String) deleteResult.get("result");

            if ("ok".equals(result)) {
                log.info("File deleted from Cloudinary. Public ID: {}", publicId);
            } else {
                log.warn("Failed to delete file from Cloudinary. Public ID: {}, Result: {}", publicId, result);
            }
        } catch (Exception e) {
            log.warn("Error deleting file from Cloudinary. URL: {}, Error: {}", url, e.getMessage());
        }
    }

    /**
     * Extract public_id from Cloudinary URL
     *
     * Cloudinary URL format:
     * https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{ext}
     * or
     * https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformation}/{public_id}.{ext}
     *
     * @param url Cloudinary URL
     * @return public_id (e.g., "folder/filename") or null if cannot parse
     */
    private String extractPublicIdFromUrl(String url) {
        try {
            // Find the part after "/upload/"
            int uploadIndex = url.indexOf("/upload/");
            if (uploadIndex == -1) {
                return null;
            }

            String pathAfterUpload = url.substring(uploadIndex + "/upload/".length());

            // Remove version if present (format: v1234567890/)
            if (pathAfterUpload.startsWith("v") && pathAfterUpload.indexOf('/') > 0) {
                int versionEndIndex = pathAfterUpload.indexOf('/');
                pathAfterUpload = pathAfterUpload.substring(versionEndIndex + 1);
            }

            // Remove transformation if present (format: w_500,h_500/ or c_scale,w_500/)
            // Transformation typically contains underscore or comma
            while (pathAfterUpload.matches("^[^/]+_[^/]+/.*") ||
                    pathAfterUpload.matches("^[^/]+,[^/]+/.*")) {
                int slashIndex = pathAfterUpload.indexOf('/');
                if (slashIndex > 0) {
                    pathAfterUpload = pathAfterUpload.substring(slashIndex + 1);
                } else {
                    break;
                }
            }

            // Remove file extension
            int lastDot = pathAfterUpload.lastIndexOf('.');
            if (lastDot > 0) {
                pathAfterUpload = pathAfterUpload.substring(0, lastDot);
            }

            return pathAfterUpload;
        } catch (Exception e) {
            log.warn("Error extracting public_id from URL {}: {}", url, e.getMessage());
            return null;
        }
    }
}
