package com.nova_beauty.backend.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.nova_beauty.backend.dto.request.ApiResponse;
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

    @PostMapping(value = "/upload-product", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<String>> uploadProductMedia(@RequestPart("files") List<MultipartFile> files) {
        List<String> urls = files.stream()
                .map(fileStorageService::storeProductMedia)
                .collect(Collectors.toList());
        return ApiResponse.<List<String>>builder().result(urls).build();
    }
}


