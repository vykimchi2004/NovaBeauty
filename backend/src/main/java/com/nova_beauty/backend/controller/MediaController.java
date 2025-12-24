package com.nova_beauty.backend.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.nova_beauty.backend.dto.request.ApiResponse;
import com.nova_beauty.backend.service.CloudinarySignatureService;
import com.nova_beauty.backend.service.FileStorageService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/media")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MediaController {

    FileStorageService fileStorageService;
    CloudinarySignatureService cloudinarySignatureService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<String>> uploadProfileMedia(@RequestPart("files") List<MultipartFile> files) {
        List<String> urls = files.stream()
                .map(fileStorageService::storeProfileMedia)
                .collect(Collectors.toList());
        return ApiResponse.<List<String>>builder().result(urls).build();
    }

    @PostMapping(value = "/upload-product", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<String>> uploadProductMedia(@RequestPart("files") List<MultipartFile> files) {
        List<String> urls = files.stream()
                .map(fileStorageService::storeProductMedia)
                .collect(Collectors.toList());
        return ApiResponse.<List<String>>builder().result(urls).build();
    }

    @PostMapping(value = "/upload-voucher", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<String>> uploadVoucherMedia(@RequestPart("files") List<MultipartFile> files) {
        List<String> urls = files.stream()
                .map(fileStorageService::storeVoucherMedia)
                .collect(Collectors.toList());
        return ApiResponse.<List<String>>builder().result(urls).build();
    }

    @PostMapping(value = "/upload-promotion", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<String>> uploadPromotionMedia(@RequestPart("files") List<MultipartFile> files) {
        List<String> urls = files.stream()
                .map(fileStorageService::storePromotionMedia)
                .collect(Collectors.toList());
        return ApiResponse.<List<String>>builder().result(urls).build();
    }

    @PostMapping(value = "/upload-banner", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<String>> uploadBannerMedia(@RequestPart("files") List<MultipartFile> files) {
        List<String> urls = files.stream()
                .map(fileStorageService::storeBannerMedia)
                .collect(Collectors.toList());
        return ApiResponse.<List<String>>builder().result(urls).build();
    }

    @PostMapping("/cloudinary-signature")
    public ApiResponse<Map<String, Object>> getCloudinarySignature(@RequestParam String folder) {
        Map<String, Object> signature = cloudinarySignatureService.generateUploadSignature(folder);
        return ApiResponse.<Map<String, Object>>builder().result(signature).build();
    }

}
