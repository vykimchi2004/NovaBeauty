package com.nova_beauty.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nova_beauty.backend.entity.FinancialRecord;
import com.nova_beauty.backend.enums.FinancialRecordType;

public interface FinancialRecordRepository extends JpaRepository<FinancialRecord, String> {

    @Query("select date(fr.occurredAt) as d, sum(fr.amount) as total " + "from FinancialRecord fr "
            + "where fr.recordType = :type and fr.occurredAt between :start and :end "
            + "group by date(fr.occurredAt) order by date(fr.occurredAt)")
    List<Object[]> revenueByDay(
            @Param("type") FinancialRecordType type,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("select fr.product.id, fr.product.name, sum(fr.amount) " + "from FinancialRecord fr "
            + "where fr.recordType = :type and fr.occurredAt between :start and :end and fr.product is not null "
            + "group by fr.product.id, fr.product.name")
    List<Object[]> revenueByProduct(
            @Param("type") FinancialRecordType type,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("select fr.paymentMethod, sum(fr.amount) " + "from FinancialRecord fr "
            + "where fr.recordType = :type and fr.occurredAt between :start and :end and fr.paymentMethod is not null "
            + "group by fr.paymentMethod")
    List<Object[]> revenueByPayment(
            @Param("type") FinancialRecordType type,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}
