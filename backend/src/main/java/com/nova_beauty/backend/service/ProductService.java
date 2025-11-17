package com.nova_beauty.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.request.ProductCreationRequest;
import com.nova_beauty.backend.dto.request.ProductUpdateRequest;
import com.nova_beauty.backend.dto.response.ProductResponse;
import com.nova_beauty.backend.entity.Category;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.entity.User;
import com.nova_beauty.backend.enums.ProductStatus;
import com.nova_beauty.backend.exception.AppException;
import com.nova_beauty.backend.exception.ErrorCode;
import com.nova_beauty.backend.mapper.ProductMapper;
import com.nova_beauty.backend.repository.CategoryRepository;
import com.nova_beauty.backend.repository.ProductRepository;
import com.nova_beauty.backend.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ProductService {

    ProductRepository productRepository;
    CategoryRepository categoryRepository;
    UserRepository userRepository;
    ProductMapper productMapper;

    @Transactional
    public ProductResponse createProduct(ProductCreationRequest request) {
        // Get current user from security context
        var context = SecurityContextHolder.getContext();
        String userId = context.getAuthentication().getName();

        // Get user
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Get category
        Category category = categoryRepository
                .findById(request.getCategoryId())
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));

        // Create product entity using mapper
        Product product = productMapper.toProduct(request);
        product.setSubmittedBy(user);
        product.setCategory(category);
        product.setStatus(ProductStatus.PENDING); // Set default status to PENDING
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());
        product.setQuantitySold(0);
        normalizePrices(product);

        Product savedProduct = productRepository.save(product);
        log.info("Product created with ID: {} by user: {}", savedProduct.getId(), userId);

        return productMapper.toResponse(savedProduct);
    }

    public ProductResponse getProductById(String productId) {
        Product product = productRepository
                .findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        return productMapper.toResponse(product);
    }

    public List<ProductResponse> getAllProducts() {
        List<Product> products = productRepository.findAll();

        return products.stream().map(productMapper::toResponse).toList();
    }

    public List<ProductResponse> getActiveProducts() {
        List<Product> products = productRepository.findByStatus(ProductStatus.APPROVED);

        return products.stream().map(productMapper::toResponse).toList();
    }

    public List<ProductResponse> getProductsByCategory(String categoryId) {
        List<Product> products = productRepository.findByCategoryId(categoryId);

        return products.stream().map(productMapper::toResponse).toList();
    }

    public List<ProductResponse> searchProducts(String keyword) {
        List<Product> products = productRepository.findByKeyword(keyword);

        return products.stream().map(productMapper::toResponse).toList();
    }

    public List<ProductResponse> getProductsByPriceRange(Double minPrice, Double maxPrice) {
        List<Product> products = productRepository.findByPriceRange(minPrice, maxPrice);

        return products.stream().map(productMapper::toResponse).toList();
    }

    public List<ProductResponse> getMyProducts() {
        // Get current user from security context
        var context = SecurityContextHolder.getContext();
        String userId = context.getAuthentication().getName();

        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<Product> products = productRepository.findBySubmittedBy(user);

        return products.stream().map(productMapper::toResponse).toList();
    }

    @Transactional
    public ProductResponse updateProduct(String productId, ProductUpdateRequest request) {
        // Get current user from security context
        var context = SecurityContextHolder.getContext();
        String userId = context.getAuthentication().getName();

        Product product = productRepository
                .findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        // Check if user is the submitter or admin
        boolean isAdmin = context.getAuthentication().getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin && !product.getSubmittedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Update product using mapper
        productMapper.updateProduct(product, request);
        normalizePrices(product);
        product.setUpdatedAt(LocalDateTime.now());

        // Update category if provided
        if (request.getCategoryId() != null && !request.getCategoryId().isEmpty()) {
            Category category = categoryRepository
                    .findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));
            product.setCategory(category);
        }

        Product savedProduct = productRepository.save(product);
        log.info("Product updated: {} by user: {}", productId, userId);

        return productMapper.toResponse(savedProduct);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteProduct(String productId) {
        Product product = productRepository
                .findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_EXISTED));

        productRepository.delete(product);
        log.info("Product deleted: {}", productId);
    }

    private void normalizePrices(Product product) {
        if (product.getUnitPrice() == null && product.getPrice() != null) {
            product.setUnitPrice(product.getPrice());
        }
        if (product.getPrice() == null && product.getUnitPrice() != null) {
            product.setPrice(product.getUnitPrice());
        }
    }
}
