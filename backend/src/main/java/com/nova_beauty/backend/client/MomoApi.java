package com.nova_beauty.backend.client;

import com.nova_beauty.backend.dto.request.CreateMomoRequest;
import com.nova_beauty.backend.dto.response.CreateMomoResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "momo", url = "${momo.end-point}")
public interface MomoApi {

    @PostMapping("/create")
    CreateMomoResponse createMomoQR(@RequestBody CreateMomoRequest createMomoRequest);
}

