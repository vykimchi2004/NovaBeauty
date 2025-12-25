package com.nova_beauty.backend.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nova_beauty.backend.entity.Order;

public interface OrderRepository extends JpaRepository<Order, String> {

        /**
         * Tìm các đơn hàng theo email của user (subject của JWT).
         * Hiển thị tất cả đơn hàng của user, bao gồm cả đơn MoMo đang chờ thanh toán
         * (PENDING)
         * để user có thể theo dõi trạng thái thanh toán.
         */
        @EntityGraph(attributePaths = {
                        "items",
                        "items.product",
                        "items.product.defaultMedia",
                        "items.product.mediaList"
        })
        @Query("SELECT o FROM Order o WHERE o.user.email = :email "
                        + "ORDER BY o.orderDateTime DESC")
        List<Order> findByUserEmail(@Param("email") String email);

        /**
         * Tìm đơn hàng gắn với một giỏ hàng cụ thể.
         * Do mapping @OneToOne nên tối đa chỉ có 1 đơn cho mỗi cart.
         */
        @EntityGraph(attributePaths = {
                        "items",
                        "items.product",
                        "items.product.defaultMedia",
                        "items.product.mediaList"
        })
        Optional<Order> findByCartId(String cartId);

        @EntityGraph(attributePaths = {
                        "items",
                        "items.product",
                        "items.product.defaultMedia",
                        "items.product.mediaList"
        })
        Optional<Order> findByCode(String code);

        @Override
        @EntityGraph(attributePaths = {
                        "items",
                        "items.product",
                        "items.product.defaultMedia",
                        "items.product.mediaList"
        })
        Optional<Order> findById(String id);

        /**
         * Tìm các đơn hàng có status liên quan đến trả hàng/hoàn tiền.
         * Dành cho Customer Support để quản lý yêu cầu trả hàng.
         */
        @EntityGraph(attributePaths = {
                        "items",
                        "items.product",
                        "items.product.defaultMedia",
                        "items.product.mediaList",
                        "user"
        })
        @Query("SELECT o FROM Order o WHERE o.status IN :statuses ORDER BY o.orderDateTime DESC")
        List<Order> findByStatusIn(
                        @Param("statuses") List<com.nova_beauty.backend.enums.OrderStatus> statuses);

        /**
         * Tìm các đơn hàng trong khoảng thời gian với pagination, sắp xếp theo
         * orderDateTime DESC
         */
        @EntityGraph(attributePaths = {
                        "items",
                        "items.product",
                        "items.product.defaultMedia",
                        "items.product.mediaList",
                        "user"
        })
        @Query("SELECT o FROM Order o WHERE o.orderDateTime BETWEEN :start AND :end ORDER BY o.orderDateTime DESC")
        Page<Order> findByOrderDateTimeBetween(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        Pageable pageable);

        // Tìm các đơn hàng trong khoảng thời gian, sắp xếp theo orderDateTime DESC
        // (không phân trang)
        List<Order> findByOrderDateTimeBetween(LocalDateTime start, LocalDateTime end);

        // Đếm số đơn hàng đã giao (DELIVERED) trong khoảng thời gian
        // Kiểm tra cả orderDateTime và orderDate (fallback nếu orderDateTime là NULL)
        @Query("SELECT COUNT(o) FROM Order o WHERE o.status = 'DELIVERED' AND " +
                        "((o.orderDateTime IS NOT NULL AND o.orderDateTime BETWEEN :start AND :end) OR " +
                        "(o.orderDateTime IS NULL AND o.orderDate IS NOT NULL AND o.orderDate BETWEEN :startDate AND :endDate))")
        Long countByOrderDateTimeBetween(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        // Đếm số đơn hàng bị hủy trong khoảng thời gian
        @Query("SELECT COUNT(o) FROM Order o WHERE o.status = 'CANCELLED' AND " +
                        "((o.orderDateTime IS NOT NULL AND o.orderDateTime BETWEEN :start AND :end) OR " +
                        "(o.orderDateTime IS NULL AND o.orderDate IS NOT NULL AND o.orderDate BETWEEN :startDate AND :endDate))")
        Long countCancelledOrdersByOrderDateTimeBetween(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        // Đếm số đơn hàng đã hoàn tiền trong khoảng thời gian
        @Query("SELECT COUNT(o) FROM Order o WHERE o.status = 'REFUNDED' AND " +
                        "((o.orderDateTime IS NOT NULL AND o.orderDateTime BETWEEN :start AND :end) OR " +
                        "(o.orderDateTime IS NULL AND o.orderDate IS NOT NULL AND o.orderDate BETWEEN :startDate AND :endDate))")
        Long countRefundedOrdersByOrderDateTimeBetween(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        // Kiểm tra xem địa chỉ có đang được sử dụng bởi đơn hàng nào không
        boolean existsByAddressAddressId(String addressId);
}
