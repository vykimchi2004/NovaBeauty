package com.nova_beauty.backend.mapper;

import org.mapstruct.Mapper;

import com.nova_beauty.backend.constant.GhnConstants;
import com.nova_beauty.backend.dto.request.GhnCalculateFeeRequest;
import com.nova_beauty.backend.dto.request.GhnCreateOrderRequest;
import com.nova_beauty.backend.dto.request.GhnLeadtimeRequest;
import com.nova_beauty.backend.dto.request.GhnOrderItemCategoryRequest;
import com.nova_beauty.backend.dto.request.GhnOrderItemRequest;
import com.nova_beauty.backend.entity.OrderItem;
import com.nova_beauty.backend.entity.Product;

@Mapper(componentModel = "spring")
public interface GhnMapper {

    GhnCalculateFeeRequest toCalculateFeeRequest(GhnCreateOrderRequest ghnRequest);

    GhnLeadtimeRequest toLeadtimeRequest(GhnCreateOrderRequest ghnRequest);

    // Build GhnOrderItemRequest từ OrderItem.
    default GhnOrderItemRequest toGhnOrderItem(OrderItem item) {
        Product product = item.getProduct();
        if (product == null) {
            throw new IllegalArgumentException("OrderItem must have a product");
        }

        ProductDimensions dims = getProductDimensions(product);
        GhnOrderItemCategoryRequest category = buildItemCategory(product);

        return GhnOrderItemRequest.builder()
                .name(product.getName())
                .code(product.getId())
                .quantity(item.getQuantity() != null ? item.getQuantity() : 1)
                .price(item.getFinalPrice() != null ? item.getFinalPrice().intValue() : 0)
                .length(dims.length)
                .width(dims.width)
                .height(dims.height)
                .weight(dims.weight)
                .category(category)
                .build();
    }

    // Build category cho item.
    default GhnOrderItemCategoryRequest buildItemCategory(Product product) {
        String categoryName = product.getCategory() != null
                ? product.getCategory().getName()
                : "Sách";
        return GhnOrderItemCategoryRequest.builder()
                .level1(categoryName)
                .build();
    }

    // Lấy kích thước sản phẩm, sử dụng giá trị mặc định nếu thiếu.
    default ProductDimensions getProductDimensions(Product product) {
        if (product == null) {
            return createDefaultProductDimensions();
        }

        int length = getDimensionValue(product.getLength());
        int width = getDimensionValue(product.getWidth());
        int height = getDimensionValue(product.getHeight());
        int weight = getWeightValue(product.getWeight());

        return new ProductDimensions(
                Math.max(length, GhnConstants.DEFAULT_DIMENSION),
                Math.max(width, GhnConstants.DEFAULT_DIMENSION),
                Math.max(height, GhnConstants.DEFAULT_DIMENSION),
                Math.max(weight, GhnConstants.DEFAULT_WEIGHT)
        );
    }

    // Lấy giá trị dimension, sử dụng default nếu null.
    default int getDimensionValue(Double value) {
        return value != null ? value.intValue() : GhnConstants.DEFAULT_DIMENSION;
    }

    // Lấy giá trị weight, sử dụng default nếu null.
    default int getWeightValue(Double value) {
        return value != null ? (int) Math.round(value) : GhnConstants.DEFAULT_WEIGHT;
    }

    // Tạo dimensions mặc định cho product.
    default ProductDimensions createDefaultProductDimensions() {
        return new ProductDimensions(
                GhnConstants.DEFAULT_DIMENSION,
                GhnConstants.DEFAULT_DIMENSION,
                GhnConstants.DEFAULT_DIMENSION,
                GhnConstants.DEFAULT_WEIGHT
        );
    }

    // Kích thước sản phẩm.
    class ProductDimensions {
        public final int length, width, height, weight;

        public ProductDimensions(int length, int width, int height, int weight) {
            this.length = length;
            this.width = width;
            this.height = height;
            this.weight = weight;
        }
    }
}

