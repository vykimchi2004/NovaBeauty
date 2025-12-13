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
     * Chỉ trả về đơn hàng đã thanh toán thành công hoặc đơn COD (không cần thanh toán trước).
     * Loại bỏ đơn hàng MoMo chưa thanh toán (paymentStatus = PENDING, FAILED, CANCELLED và paymentMethod = MOMO).
     */
    @EntityGraph(
            attributePaths = {
                "items",
                "items.product",
                "items.product.defaultMedia",
                "items.product.mediaList"
            })
    @Query(
            "SELECT o FROM Order o WHERE o.user.email = :email "
                    + "AND (o.paymentMethod != 'MOMO' OR o.paymentStatus = 'PAID') "
                    + "ORDER BY o.orderDateTime DESC")
    List<Order> findByUserEmail(@Param("email") String email);

    /**
     * Tìm đơn hàng gắn với một giỏ hàng cụ thể.
     * Do mapping @OneToOne nên tối đa chỉ có 1 đơn cho mỗi cart.
     */
    @EntityGraph(
            attributePaths = {
                "items",
                "items.product",
                "items.product.defaultMedia",
                "items.product.mediaList"
            })
    Optional<Order> findByCartId(String cartId);

    @EntityGraph(
            attributePaths = {
                "items",
                "items.product",
                "items.product.defaultMedia",
                "items.product.mediaList"
            })
    Optional<Order> findByCode(String code);

    @Override
    @EntityGraph(
            attributePaths = {
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
    @EntityGraph(
            attributePaths = {
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
     * Tìm các đơn hàng trong khoảng thời gian với pagination, sắp xếp theo orderDateTime DESC
     */
    @EntityGraph(
            attributePaths = {
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

    // Tìm các đơn hàng trong khoảng thời gian, sắp xếp theo orderDateTime DESC (không phân trang)
    // Có fallback cho orderDate nếu orderDateTime là NULL
    @Query("SELECT o FROM Order o WHERE " +
           "(o.orderDateTime IS NOT NULL AND o.orderDateTime BETWEEN :start AND :end) OR " +
           "(o.orderDateTime IS NULL AND o.orderDate IS NOT NULL AND o.orderDate BETWEEN :startDate AND :endDate) " +
           "ORDER BY o.orderDateTime DESC, o.orderDate DESC")
    List<Order> findByOrderDateTimeBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Đếm số đơn hàng trong khoảng thời gian
    // Kiểm tra cả orderDateTime và orderDate (fallback nếu orderDateTime là NULL)
    @Query("SELECT COUNT(o) FROM Order o WHERE " +
           "(o.orderDateTime IS NOT NULL AND o.orderDateTime BETWEEN :start AND :end) OR " +
           "(o.orderDateTime IS NULL AND o.orderDate IS NOT NULL AND o.orderDate BETWEEN :startDate AND :endDate)")
    Long countByOrderDateTimeBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Đếm số đơn hàng bị hủy trong khoảng thời gian
    @Query(
            "SELECT COUNT(o) FROM Order o WHERE o.status = 'CANCELLED' AND " +
            "((o.orderDateTime IS NOT NULL AND o.orderDateTime BETWEEN :start AND :end) OR " +
            "(o.orderDateTime IS NULL AND o.orderDate IS NOT NULL AND o.orderDate BETWEEN :startDate AND :endDate))")
    Long countCancelledOrdersByOrderDateTimeBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // Đếm số đơn hàng đã hoàn tiền trong khoảng thời gian
    @Query(
            "SELECT COUNT(o) FROM Order o WHERE o.status = 'REFUNDED' AND " +
            "((o.orderDateTime IS NOT NULL AND o.orderDateTime BETWEEN :start AND :end) OR " +
            "(o.orderDateTime IS NULL AND o.orderDate IS NOT NULL AND o.orderDate BETWEEN :startDate AND :endDate))")
    Long countRefundedOrdersByOrderDateTimeBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
