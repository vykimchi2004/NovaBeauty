package com.nova_beauty.backend.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import com.nova_beauty.backend.dto.response.CartItemResponse;
import com.nova_beauty.backend.dto.response.CartResponse;
import com.nova_beauty.backend.entity.Cart;
import com.nova_beauty.backend.entity.CartItem;

@Mapper(componentModel = "spring")
public interface CartMapper {

    @Mapping(target = "items", source = "cartItems")
    CartResponse toResponse(Cart cart);

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productName", source = "product.name")
    CartItemResponse toItemResponse(CartItem cartItem);

    @Named("mapItems")
    default List<CartItemResponse> mapItems(List<CartItem> items) {
        if (items == null) return java.util.List.of();
        return items.stream().map(this::toItemResponse).toList();
    }
}


