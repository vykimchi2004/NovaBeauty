package com.nova_beauty.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nova_beauty.backend.entity.FinancialRecord;
import com.nova_beauty.backend.enums.FinancialRecordType;

public interface FinancialRecordRepository extends JpaRepository<FinancialRecord, String> {

    // Tính doanh thu theo đơn hàng (group theo ngày)
    // COD: chỉ tính khi status = DELIVERED
    // MoMo: chỉ tính khi status = CONFIRMED
    @Query(
            "select year(fr.occurredAt), month(fr.occurredAt), day(fr.occurredAt), "
                    + "fr.order.id as orderId, sum(fr.amount) as orderTotal "
                    + "from FinancialRecord fr "
                    + "where fr.recordType = :type "
                    + "and fr.occurredAt between :start and :end "
                    + "and fr.order.paymentStatus = 'PAID' "
                    + "and fr.order.paid = true "
                    + "and ((fr.order.paymentMethod = 'COD' and fr.order.status = 'DELIVERED') "
                    + "     or (fr.order.paymentMethod = 'MOMO' and fr.order.status = 'CONFIRMED') "
                    + "     or (fr.order.paymentMethod not in ('COD', 'MOMO'))) "
                    + "group by year(fr.occurredAt), month(fr.occurredAt), day(fr.occurredAt), fr.order.id "
                    + "order by year(fr.occurredAt), month(fr.occurredAt), day(fr.occurredAt)")
    List<Object[]> revenueByDayGroupedByOrder(
            @Param("type") FinancialRecordType type,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // Tính doanh thu theo giờ (khi cùng 1 ngày)
    // COD: chỉ tính khi status = DELIVERED
    // MoMo: chỉ tính khi status = CONFIRMED
    @Query(
            "select year(fr.occurredAt), month(fr.occurredAt), day(fr.occurredAt), hour(fr.occurredAt), "
                    + "fr.order.id as orderId, sum(fr.amount) as orderTotal "
                    + "from FinancialRecord fr "
                    + "where fr.recordType = :type "
                    + "and fr.occurredAt between :start and :end "
                    + "and fr.order.paymentStatus = 'PAID' "
                    + "and fr.order.paid = true "
                    + "and ((fr.order.paymentMethod = 'COD' and fr.order.status = 'DELIVERED') "
                    + "     or (fr.order.paymentMethod = 'MOMO' and fr.order.status = 'CONFIRMED') "
                    + "     or (fr.order.paymentMethod not in ('COD', 'MOMO'))) "
                    + "group by year(fr.occurredAt), month(fr.occurredAt), day(fr.occurredAt), hour(fr.occurredAt), fr.order.id "
                    + "order by year(fr.occurredAt), month(fr.occurredAt), day(fr.occurredAt), hour(fr.occurredAt)")
    List<Object[]> revenueByHourGroupedByOrder(
            @Param("type") FinancialRecordType type,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // Tính doanh thu theo tháng (khi cùng 1 năm)
    // COD: chỉ tính khi status = DELIVERED
    // MoMo: chỉ tính khi status = CONFIRMED
    @Query(
            "select year(fr.occurredAt), month(fr.occurredAt), "
                    + "fr.order.id as orderId, sum(fr.amount) as orderTotal "
                    + "from FinancialRecord fr "
                    + "where fr.recordType = :type "
                    + "and fr.occurredAt between :start and :end "
                    + "and fr.order.paymentStatus = 'PAID' "
                    + "and fr.order.paid = true "
                    + "and ((fr.order.paymentMethod = 'COD' and fr.order.status = 'DELIVERED') "
                    + "     or (fr.order.paymentMethod = 'MOMO' and fr.order.status = 'CONFIRMED') "
                    + "     or (fr.order.paymentMethod not in ('COD', 'MOMO'))) "
                    + "group by year(fr.occurredAt), month(fr.occurredAt), fr.order.id "
                    + "order by year(fr.occurredAt), month(fr.occurredAt)")
    List<Object[]> revenueByMonthGroupedByOrder(
            @Param("type") FinancialRecordType type,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // Tính doanh thu theo phương thức thanh toán
    // COD: chỉ tính khi status = DELIVERED
    // MoMo: chỉ tính khi status = CONFIRMED
    @Query(
            "select fr.paymentMethod, sum(fr.amount) "
                    + "from FinancialRecord fr "
                    + "where fr.recordType = :type "
                    + "and fr.occurredAt between :start and :end "
                    + "and fr.paymentMethod is not null "
                    + "and fr.order.paymentStatus = 'PAID' "
                    + "and fr.order.paid = true "
                    + "and ((fr.order.paymentMethod = 'COD' and fr.order.status = 'DELIVERED') "
                    + "     or (fr.order.paymentMethod = 'MOMO' and fr.order.status = 'CONFIRMED') "
                    + "     or (fr.order.paymentMethod not in ('COD', 'MOMO'))) "
                    + "group by fr.paymentMethod")
    List<Object[]> revenueByPayment(
            @Param("type") FinancialRecordType type,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // Lấy tất cả bản ghi tài chính trong khoảng thời gian.
    List<FinancialRecord> findByOccurredAtBetween(LocalDateTime start, LocalDateTime end);

    // Kiểm tra xem đã có FinancialRecord cho order này chưa
    boolean existsByOrderIdAndRecordType(String orderId, FinancialRecordType recordType);

    // Lấy tất cả FinancialRecord của một order theo recordType
    List<FinancialRecord> findByOrderIdAndRecordType(String orderId, FinancialRecordType recordType);

    // Lấy tất cả FinancialRecord của một product
    List<FinancialRecord> findByProductId(String productId);
}
