package com.nova_beauty.backend.service;

import com.cloudinary.Cloudinary;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class CloudinarySignatureService {

    private final Cloudinary cloudinary;

    // Valid folder names for security
    private static final String PRODUCT_MEDIA_FOLDER = "product_media";
    private static final String VOUCHER_MEDIA_FOLDER = "voucher_media";
    private static final String PROMOTION_MEDIA_FOLDER = "promotion_media";
    private static final String PROFILE_MEDIA_FOLDER = "profile_media";
    private static final String BANNER_MEDIA_FOLDER = "banners";

    /**
     * Generate Cloudinary upload signature for frontend direct upload
     *
     * @param folder Target folder name (must be valid)
     * @return Map containing signature, timestamp, api_key, cloud_name, and folder
     */
    public Map<String, Object> generateUploadSignature(String folder) {
        // Validate folder name
        if (!isValidFolder(folder)) {
            log.warn("Invalid folder name requested: {}", folder);
            throw new IllegalArgumentException("Invalid folder name: " + folder);
        }

        // Generate timestamp (current time in seconds)
        long timestamp = System.currentTimeMillis() / 1000;

        // Prepare params to sign
        Map<String, Object> paramsToSign = new HashMap<>();
        paramsToSign.put("timestamp", timestamp);
        paramsToSign.put("folder", folder);
        paramsToSign.put("upload_preset", ""); // Empty for signed uploads

        // Generate signature using Cloudinary SDK
        String signature = cloudinary.apiSignRequest(paramsToSign, cloudinary.config.apiSecret);

        // Prepare response
        Map<String, Object> result = new HashMap<>();
        result.put("signature", signature);
        result.put("timestamp", timestamp);
        result.put("api_key", cloudinary.config.apiKey);
        result.put("cloud_name", cloudinary.config.cloudName);
        result.put("folder", folder);

        log.info("Generated Cloudinary signature for folder: {}, timestamp: {}", folder, timestamp);
        return result;
    }

    /**
     * Validate folder name to prevent unauthorized uploads
     *
     * @param folder Folder name to validate
     * @return true if folder is valid, false otherwise
     */
    private boolean isValidFolder(String folder) {
        if (folder == null || folder.isBlank()) {
            return false;
        }

        return folder.equals(PRODUCT_MEDIA_FOLDER) ||
                folder.equals(VOUCHER_MEDIA_FOLDER) ||
                folder.equals(PROMOTION_MEDIA_FOLDER) ||
                folder.equals(PROFILE_MEDIA_FOLDER) ||
                folder.equals(BANNER_MEDIA_FOLDER);
    }
}
