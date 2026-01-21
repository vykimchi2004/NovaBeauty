package com.hanoi_metro.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hanoi_metro.backend.dto.request.MagazineCreationRequest;
import com.hanoi_metro.backend.dto.request.MagazineUpdateRequest;
import com.hanoi_metro.backend.dto.response.MagazineResponse;
import com.hanoi_metro.backend.entity.Magazine;
import com.hanoi_metro.backend.entity.User;
import com.hanoi_metro.backend.exception.AppException;
import com.hanoi_metro.backend.exception.ErrorCode;
import com.hanoi_metro.backend.repository.MagazineRepository;
import com.hanoi_metro.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class MagazineService {

    MagazineRepository magazineRepository;
    UserRepository userRepository;

    @Transactional
    @PreAuthorize("hasRole('STAFF')")
    public MagazineResponse createMagazine(MagazineCreationRequest req) {
        var context = SecurityContextHolder.getContext();
        String email = context.getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Magazine m = Magazine.builder()
                .title(req.getTitle())
                .content(req.getContent())
                .imageUrl(req.getImageUrl())
                .status(req.getStatus() == null ? true : req.getStatus())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .createdBy(user)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Magazine saved = magazineRepository.save(m);
        return toResponse(saved);
    }

    public List<MagazineResponse> getAllMagazines() {
        return magazineRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<MagazineResponse> getActiveMagazines() {
        return magazineRepository.findByStatusOrderByStartDateAsc(true).stream().map(this::toResponse).collect(Collectors.toList());
    }

    public MagazineResponse getById(String id) {
        Magazine m = magazineRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.BANNER_NOT_EXISTED));
        return toResponse(m);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public MagazineResponse updateMagazine(String id, MagazineUpdateRequest req) {
        var context = SecurityContextHolder.getContext();
        String email = context.getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Magazine m = magazineRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.BANNER_NOT_EXISTED));

        boolean isAdmin = context.getAuthentication().getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && (m.getCreatedBy() == null || !m.getCreatedBy().getId().equals(user.getId()))) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        if (req.getTitle() != null) m.setTitle(req.getTitle());
        if (req.getContent() != null) m.setContent(req.getContent());
        if (req.getImageUrl() != null) m.setImageUrl(req.getImageUrl());
        if (req.getStatus() != null) m.setStatus(req.getStatus());
        if (req.getStartDate() != null) m.setStartDate(req.getStartDate());
        if (req.getEndDate() != null) m.setEndDate(req.getEndDate());

        m.setUpdatedAt(LocalDateTime.now());
        Magazine saved = magazineRepository.save(m);
        return toResponse(saved);
    }

    private MagazineResponse toResponse(Magazine m) {
        return MagazineResponse.builder()
                .id(m.getId())
                .title(m.getTitle())
                .content(m.getContent())
                .imageUrl(m.getImageUrl())
                .status(m.getStatus())
                .startDate(m.getStartDate())
                .endDate(m.getEndDate())
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .createdBy(m.getCreatedBy() == null ? null : m.getCreatedBy().getId())
                .createdByName(m.getCreatedBy() == null ? null : m.getCreatedBy().getFullName())
                .build();
    }
}
