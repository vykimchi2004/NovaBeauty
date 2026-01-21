package com.hanoi_metro.backend.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.hanoi_metro.backend.dto.request.MagazineCreationRequest;
import com.hanoi_metro.backend.dto.request.MagazineUpdateRequest;
import com.hanoi_metro.backend.dto.response.MagazineResponse;
import com.hanoi_metro.backend.service.MagazineService;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequestMapping("/magazines")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MagazineController {

    MagazineService magazineService;

    @GetMapping
    public List<MagazineResponse> list() {
        return magazineService.getAllMagazines();
    }

    @GetMapping("/active")
    public List<MagazineResponse> active() {
        return magazineService.getActiveMagazines();
    }

    @GetMapping("/{id}")
    public MagazineResponse get(@PathVariable String id) {
        return magazineService.getById(id);
    }

    @PostMapping
    public MagazineResponse create(@Valid @RequestBody MagazineCreationRequest req) {
        return magazineService.createMagazine(req);
    }

    @PutMapping("/{id}")
    public MagazineResponse update(@PathVariable String id, @RequestBody MagazineUpdateRequest req) {
        return magazineService.updateMagazine(id, req);
    }
}
