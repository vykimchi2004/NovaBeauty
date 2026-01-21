package com.hanoi_metro.backend.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import com.hanoi_metro.backend.dto.response.CartItemResponse;
import com.hanoi_metro.backend.dto.response.CartResponse;
import com.hanoi_metro.backend.entity.Cart;
import com.hanoi_metro.backend.entity.CartItem;

@Mapper(componentModel = "spring")
public interface CartMapper {

    @Mapping(target = "items", source = "cartItems")
    CartResponse toResponse(Cart cart);

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productName", source = "product.name")
    @Mapping(target = "colorCode", source = "colorCode")
    CartItemResponse toItemResponse(CartItem cartItem);

    @Named("mapItems")
    default List<CartItemResponse> mapItems(List<CartItem> items) {
        if (items == null) return java.util.List.of();
        return items.stream().map(this::toItemResponse).toList();
    }
}
