package com.nova_beauty.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nova_beauty.backend.dto.response.FinancialSummary;
import com.nova_beauty.backend.dto.response.PaymentRevenue;
import com.nova_beauty.backend.dto.response.ProductRevenue;
import com.nova_beauty.backend.dto.response.RevenuePoint;
import com.nova_beauty.backend.dto.response.RevenueSummary;
import com.nova_beauty.backend.entity.FinancialRecord;
import com.nova_beauty.backend.entity.Order;
import com.nova_beauty.backend.entity.OrderItem;
import com.nova_beauty.backend.entity.Product;
import com.nova_beauty.backend.enums.FinancialRecordType;
import com.nova_beauty.backend.enums.OrderStatus;
import com.nova_beauty.backend.enums.PaymentMethod;
import com.nova_beauty.backend.enums.PaymentStatus;
import com.nova_beauty.backend.repository.FinancialRecordRepository;
import com.nova_beauty.backend.repository.OrderRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FinancialService {

    FinancialRecordRepository financialRecordRepository;
    OrderRepository orderRepository;

    // Chuyển đổi LocalDate thành LocalDateTime range (start of day đến end of day).
    private LocalDateTime[] toDateTimeRange(LocalDate start, LocalDate end) {
        return new LocalDateTime[] {start.atStartOfDay(), end.atTime(LocalTime.MAX)};
    }

    // Lọc các đơn hàng đã thanh toán thành công trong khoảng thời gian
    // - COD: chỉ tính khi đơn hàng đã được giao thành công (status = DELIVERED)
    // - MoMo: tính khi đã thanh toán thành công (status = CREATED hoặc CONFIRMED) vì đã thanh toán rồi
    private List<Order> getPaidOrdersInRange(LocalDateTime start, LocalDateTime end) {
        // Lấy tất cả đơn hàng trong khoảng thời gian (có fallback cho orderDate)
        LocalDate startDate = start.toLocalDate();
        LocalDate endDate = end.toLocalDate();
        List<Order> allOrders = orderRepository.findByOrderDateTimeBetween(start, end, startDate, endDate);
        
        log.info("Querying orders between {} and {}", start, end);
        log.info("Found {} orders with orderDateTime in range", allOrders.size());
        
        // Log một vài đơn hàng để debug
        if (!allOrders.isEmpty()) {
            log.info("Sample orders: {}", allOrders.stream()
                .limit(3)
                .map(o -> String.format("id=%s, status=%s, paymentMethod=%s, paymentStatus=%s, paid=%s, orderDateTime=%s, orderDate=%s", 
                    o.getId(), o.getStatus(), o.getPaymentMethod(), o.getPaymentStatus(), o.getPaid(), 
                    o.getOrderDateTime(), o.getOrderDate()))
                .collect(Collectors.joining("; ")));
        }
        
        List<Order> paidOrders = allOrders.stream()
                .filter(
                        order -> {
                            // Kiểm tra điều kiện cơ bản: đã thanh toán và có items
                            if (order.getPaymentStatus() != PaymentStatus.PAID) {
                                log.debug("Order {} filtered: paymentStatus != PAID ({})", 
                                    order.getId(), order.getPaymentStatus());
                                return false;
                            }
                            if (!Boolean.TRUE.equals(order.getPaid())) {
                                log.debug("Order {} filtered: paid != true", order.getId());
                                return false;
                            }
                            if (order.getItems() == null || order.getItems().isEmpty()) {
                                log.debug("Order {} filtered: no items", order.getId());
                                return false;
                            }

                            // Kiểm tra điều kiện theo phương thức thanh toán
                            PaymentMethod paymentMethod = order.getPaymentMethod();
                            if (paymentMethod == PaymentMethod.COD) {
                                // COD: chỉ tính khi đơn hàng đã được giao thành công (khách hàng đã trả
                                // tiền)
                                boolean matches = order.getStatus() == OrderStatus.DELIVERED;
                                if (!matches) {
                                    log.debug("Order {} filtered: COD but status != DELIVERED ({})", 
                                        order.getId(), order.getStatus());
                                }
                                return matches;
                            } else if (paymentMethod == PaymentMethod.MOMO) {
                                // MoMo: tính khi đã thanh toán thành công (CREATED hoặc CONFIRMED)
                                // Vì đã thanh toán qua MoMo rồi nên có thể tính ngay, không cần chờ xác nhận
                                boolean matches = order.getStatus() == OrderStatus.CREATED 
                                    || order.getStatus() == OrderStatus.CONFIRMED;
                                if (!matches) {
                                    log.debug("Order {} filtered: MoMo but status not CREATED/CONFIRMED ({})", 
                                        order.getId(), order.getStatus());
                                }
                                return matches;
                            }

                            // Các phương thức thanh toán khác: giữ nguyên logic cũ
                            return true;
                        })
                .toList();
        
        log.info("Filtered to {} paid orders from {} total orders", paidOrders.size(), allOrders.size());
        return paidOrders;
    }

    // Tính tổng doanh thu từ danh sách đơn hàng đã thanh toán
    private double calculateTotalRevenue(List<Order> paidOrders) {
        return paidOrders.stream()
                .flatMap(order -> order.getItems().stream())
                .filter(item -> item.getFinalPrice() != null && item.getFinalPrice() > 0)
                .mapToDouble(OrderItem::getFinalPrice)
                .sum();
    }

    // Kiểm tra xem đã ghi nhận doanh thu cho order này chưa
    public boolean hasRecordedRevenue(String orderId) {
        return financialRecordRepository.existsByOrderIdAndRecordType(
                orderId, FinancialRecordType.ORDER_PAYMENT);
    }

    // Xóa các FinancialRecord cũ của đơn COD (để ghi nhận lại với occurredAt = thời điểm DELIVERED)
    @Transactional
    public void deleteOrderRevenueRecords(String orderId) {
        List<FinancialRecord> records =
                financialRecordRepository.findByOrderIdAndRecordType(
                        orderId, FinancialRecordType.ORDER_PAYMENT);
        if (!records.isEmpty()) {
            financialRecordRepository.deleteAll(records);
            log.info("Deleted {} old revenue records for COD order {}", records.size(), orderId);
        }
    }

    @Transactional
    public void recordRevenue(Order order, Product product, double amount, PaymentMethod method) {
        FinancialRecord rec =
                FinancialRecord.builder()
                .order(order)
                .product(product)
                .amount(amount)
                .paymentMethod(method)
                .recordType(FinancialRecordType.ORDER_PAYMENT)
                .occurredAt(LocalDateTime.now())
                .build();
        financialRecordRepository.save(rec);
    }

    // Xử lý lại doanh thu cho đơn COD đã DELIVERED (đảm bảo có FinancialRecord với occurredAt = thời
    // điểm DELIVERED)
    @Transactional
    public void ensureCodOrderRevenueRecorded(Order order) {
        if (order == null
                || order.getPaymentMethod() != PaymentMethod.COD
                || order.getStatus() != OrderStatus.DELIVERED
                || order.getPaymentStatus() != PaymentStatus.PAID
                || !Boolean.TRUE.equals(order.getPaid())
                || order.getItems() == null
                || order.getItems().isEmpty()) {
            return;
        }

        // Xóa FinancialRecord cũ (nếu có) để ghi nhận lại với occurredAt = thời điểm hiện tại
        deleteOrderRevenueRecords(order.getId());

        // Ghi nhận doanh thu cho từng sản phẩm trong đơn hàng
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() != null
                    && item.getFinalPrice() != null
                    && item.getFinalPrice() > 0) {
                try {
                    recordRevenue(
                            order,
                            item.getProduct(),
                            item.getFinalPrice(),
                            order.getPaymentMethod());
                } catch (Exception e) {
                    log.error(
                            "Error recording revenue for COD order {} product {}",
                            order.getId(),
                            item.getProduct().getId(),
                            e);
                }
            }
        }
        log.info(
                "Ensured revenue recorded for COD order {} when delivered with {} items",
                order.getId(),
                order.getItems().size());
    }

    // Tính doanh thu theo đơn hàng theo timeMode
    public List<RevenuePoint> revenueByDay(LocalDate start, LocalDate end, String timeMode) {
        LocalDateTime[] range = toDateTimeRange(start, end);
        
        // Đảm bảo tất cả đơn hàng đã thanh toán đều có FinancialRecord
        ensureAllPaidOrdersHaveRevenueRecords(range[0], range[1]);

        // Day mode: group theo giờ
        if ("day".equals(timeMode)) {
            List<Object[]> orderRevenueData =
                    financialRecordRepository.revenueByHourGroupedByOrder(
                            FinancialRecordType.ORDER_PAYMENT, range[0], range[1]);

            // Aggregate theo giờ (mỗi đơn hàng chỉ được tính 1 lần)
            Map<LocalDateTime, Double> revenueByHour =
                    orderRevenueData.stream()
                            .collect(
                                    Collectors.groupingBy(
                                            r -> {
                                                int year = ((Number) r[0]).intValue();
                                                int month = ((Number) r[1]).intValue();
                                                int day = ((Number) r[2]).intValue();
                                                int hour = ((Number) r[3]).intValue();
                                                return LocalDateTime.of(year, month, day, hour, 0);
                                            },
                                            Collectors.summingDouble(
                                                    r -> ((Number) r[5]).doubleValue())));

            return revenueByHour.entrySet().stream()
                    .map(entry -> new RevenuePoint(entry.getKey(), entry.getValue()))
                    .sorted(
                            (a, b) -> {
                                if (a.getDateTime() != null && b.getDateTime() != null) {
                                    return a.getDateTime().compareTo(b.getDateTime());
                                }
                                return a.getDate().compareTo(b.getDate());
                            })
                    .toList();
        }

        // Year mode: group theo tháng
        if ("year".equals(timeMode)) {
            List<Object[]> orderRevenueData =
                    financialRecordRepository.revenueByMonthGroupedByOrder(
                            FinancialRecordType.ORDER_PAYMENT, range[0], range[1]);

            // Aggregate theo tháng (mỗi đơn hàng chỉ được tính 1 lần)
            Map<LocalDate, Double> revenueByMonth =
                    orderRevenueData.stream()
                            .collect(
                                    Collectors.groupingBy(
                                            r -> {
                                                int year = ((Number) r[0]).intValue();
                                                int month = ((Number) r[1]).intValue();
                                                return LocalDate.of(year, month, 1); // Ngày 1 của tháng
                                            },
                                            Collectors.summingDouble(
                                                    r -> ((Number) r[3]).doubleValue())));

            // Fill tất cả các tháng trong năm (từ tháng 1 đến 12)
            // Dùng năm từ end date (năm hiện tại) thay vì start date
            int year = end.getYear();
            List<RevenuePoint> result = new ArrayList<>();

            // Tạo tất cả các tháng từ 1 đến 12
            for (int month = 1; month <= 12; month++) {
                LocalDate monthStart = LocalDate.of(year, month, 1);
                // Map key đã là LocalDate.of(year, month, 1), nên dùng getOrDefault trực tiếp
                Double revenue = revenueByMonth.getOrDefault(monthStart, 0.0);
                result.add(new RevenuePoint(monthStart, revenue));
            }

            return result.stream()
                    .sorted((a, b) -> a.getDate().compareTo(b.getDate()))
                    .toList();
        }

        // Month mode: group theo tuần
        if ("month".equals(timeMode)) {
            List<Object[]> orderRevenueData =
                    financialRecordRepository.revenueByDayGroupedByOrder(
                            FinancialRecordType.ORDER_PAYMENT, range[0], range[1]);

            // Aggregate theo tuần (mỗi đơn hàng chỉ được tính 1 lần)
            Map<LocalDate, Double> revenueByWeek =
                    orderRevenueData.stream()
                            .collect(
                                    Collectors.groupingBy(
                                            r -> {
                                                int year = ((Number) r[0]).intValue();
                                                int month = ((Number) r[1]).intValue();
                                                int day = ((Number) r[2]).intValue();
                                                LocalDate date = LocalDate.of(year, month, day);
                                                // Lấy ngày đầu tuần (thứ 2) của tuần đó
                                                int dayOfWeek =
                                                        date.getDayOfWeek().getValue(); // 1 = Monday, 7 = Sunday
                                                int daysToMonday =
                                                        (dayOfWeek == 1)
                                                                ? 0
                                                                : (dayOfWeek == 7) ? 6 : dayOfWeek - 1;
                                                return date.minusDays(daysToMonday);
                                            },
                                            Collectors.summingDouble(
                                                    r -> ((Number) r[4]).doubleValue())));

            // Fill tất cả các tuần trong tháng (kể cả tuần không có data)
            LocalDate monthStart = start;
            LocalDate monthEnd = end;
            List<RevenuePoint> result = new ArrayList<>();

            // Tìm tuần đầu tiên của tháng (có thể là thứ 2 của tuần chứa ngày 1)
            LocalDate firstDayOfMonth = monthStart;
            int firstDayOfWeek = firstDayOfMonth.getDayOfWeek().getValue();
            int daysToFirstMonday =
                    (firstDayOfWeek == 1)
                            ? 0
                            : (firstDayOfWeek == 7) ? 6 : firstDayOfWeek - 1;
            LocalDate firstWeekStart = firstDayOfMonth.minusDays(daysToFirstMonday);

            // Tìm tuần cuối cùng của tháng
            LocalDate lastDayOfMonth = monthEnd;
            int lastDayOfWeek = lastDayOfMonth.getDayOfWeek().getValue();
            int daysToLastMonday =
                    (lastDayOfWeek == 1)
                            ? 0
                            : (lastDayOfWeek == 7) ? 6 : lastDayOfWeek - 1;
            LocalDate lastWeekStart = lastDayOfMonth.minusDays(daysToLastMonday);

            // Tạo tất cả các tuần từ tuần đầu đến tuần cuối
            LocalDate currentWeekStart = firstWeekStart;
            while (!currentWeekStart.isAfter(lastWeekStart)) {
                Double revenue = revenueByWeek.getOrDefault(currentWeekStart, 0.0);
                result.add(new RevenuePoint(currentWeekStart, revenue));
                currentWeekStart = currentWeekStart.plusWeeks(1);
            }

            return result.stream()
                    .sorted((a, b) -> a.getDate().compareTo(b.getDate()))
                .toList();
    }

        // Week mode: group theo ngày
        List<Object[]> orderRevenueData =
                financialRecordRepository.revenueByDayGroupedByOrder(
                        FinancialRecordType.ORDER_PAYMENT, range[0], range[1]);

        // Aggregate theo date (mỗi đơn hàng chỉ được tính 1 lần)
        Map<LocalDate, Double> revenueByDate =
                orderRevenueData.stream()
                        .collect(
                                Collectors.groupingBy(
                                        r -> {
                                            // r[0] = year, r[1] = month, r[2] = day
                                            int year = ((Number) r[0]).intValue();
                                            int month = ((Number) r[1]).intValue();
                                            int day = ((Number) r[2]).intValue();
                                            return LocalDate.of(year, month, day);
                                        },
                                        Collectors.summingDouble(
                                                r -> ((Number) r[4]).doubleValue())));

        // Fill tất cả các ngày trong tuần (từ thứ 2 đến Chủ nhật)
        LocalDate weekStart = start; // start đã là thứ 2
        LocalDate weekEnd = end; // end đã là Chủ nhật
        List<RevenuePoint> result = new ArrayList<>();

        // Tạo tất cả các ngày từ thứ 2 đến Chủ nhật
        LocalDate currentDate = weekStart;
        while (!currentDate.isAfter(weekEnd)) {
            Double revenue = revenueByDate.getOrDefault(currentDate, 0.0);
            result.add(new RevenuePoint(currentDate, revenue));
            currentDate = currentDate.plusDays(1);
        }

        return result.stream()
                .sorted((a, b) -> a.getDate().compareTo(b.getDate()))
                .toList();
    }

    // Tính doanh thu theo phương thức thanh toán
    public List<PaymentRevenue> revenueByPayment(LocalDate start, LocalDate end) {
        LocalDateTime[] range = toDateTimeRange(start, end);
        
        // Đảm bảo tất cả đơn hàng đã thanh toán đều có FinancialRecord
        ensureAllPaidOrdersHaveRevenueRecords(range[0], range[1]);
        
        return financialRecordRepository
                .revenueByPayment(FinancialRecordType.ORDER_PAYMENT, range[0], range[1])
                .stream()
                .map(r -> new PaymentRevenue((PaymentMethod) r[0], ((Number) r[1]).doubleValue()))
                .toList();
    }
    
    // Đảm bảo tất cả đơn hàng đã thanh toán trong khoảng thời gian đều có FinancialRecord
    @Transactional
    private void ensureAllPaidOrdersHaveRevenueRecords(LocalDateTime start, LocalDateTime end) {
        log.info("Ensuring revenue records for orders between {} and {}", start, end);
        List<Order> paidOrders = getPaidOrdersInRange(start, end);
        log.info("Found {} paid orders to check", paidOrders.size());
        
        int createdCount = 0;
        int skippedCount = 0;
        for (Order order : paidOrders) {
            boolean hasRecord = hasRecordedRevenue(order.getId());
            log.debug("Order {} has revenue record: {}", order.getId(), hasRecord);
            
            if (!hasRecord) {
                log.info("Creating revenue records for order {} (status: {}, paymentMethod: {})", 
                    order.getId(), order.getStatus(), order.getPaymentMethod());
                
                // Ghi nhận doanh thu cho từng sản phẩm trong đơn hàng
                for (OrderItem item : order.getItems()) {
                    if (item.getProduct() != null && item.getFinalPrice() != null && item.getFinalPrice() > 0) {
                        try {
                            // Sử dụng orderDateTime thay vì LocalDateTime.now() để giữ đúng thời gian
                            LocalDateTime occurredAt = order.getOrderDateTime() != null 
                                ? order.getOrderDateTime() 
                                : (order.getOrderDate() != null 
                                    ? order.getOrderDate().atStartOfDay() 
                                    : LocalDateTime.now());
                            
                            FinancialRecord rec = FinancialRecord.builder()
                                .order(order)
                                .product(item.getProduct())
                                .amount(item.getFinalPrice())
                                .paymentMethod(order.getPaymentMethod())
                                .recordType(FinancialRecordType.ORDER_PAYMENT)
                                .occurredAt(occurredAt)
                                .build();
                            financialRecordRepository.save(rec);
                            createdCount++;
                            log.debug("Created revenue record for order {} item {}: amount {}", 
                                order.getId(), item.getId(), item.getFinalPrice());
                        } catch (Exception e) {
                            log.error("Error creating revenue record for order {} item {}", 
                                order.getId(), item.getId(), e);
                        }
                    } else {
                        log.warn("Skipping order {} item {}: product={}, finalPrice={}", 
                            order.getId(), item.getId(), 
                            item.getProduct() != null, item.getFinalPrice());
                    }
                }
            } else {
                skippedCount++;
            }
        }
        if (createdCount > 0) {
            log.info("Created {} revenue records for {} orders ({} already had records)", 
                createdCount, paidOrders.size(), skippedCount);
        } else {
            log.info("No new revenue records created. {} orders already had records", skippedCount);
        }
    }

    // Tổng doanh thu = tổng giá trị các sản phẩm bán ra (OrderItem.finalPrice), không bao gồm shipping
    // fee
    public RevenueSummary revenueSummary(LocalDate start, LocalDate end) {
        LocalDateTime[] range = toDateTimeRange(start, end);
        
        // Đảm bảo tất cả đơn hàng đã thanh toán đều có FinancialRecord
        ensureAllPaidOrdersHaveRevenueRecords(range[0], range[1]);

        // Lọc các đơn hàng đã thanh toán thành công
        List<Order> paidOrders = getPaidOrdersInRange(range[0], range[1]);

        // Tính tổng doanh thu = sum của tất cả OrderItem.finalPrice (chỉ giá sản phẩm, không có
        // shipping fee)
        double totalRevenue = calculateTotalRevenue(paidOrders);

        // Tổng đơn hàng
        long totalOrders = paidOrders.size();

        // Giá trị trung bình mỗi đơn hàng (chỉ tính giá sản phẩm, không có shipping fee)
        double averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0.0;

        return RevenueSummary.builder()
                .totalRevenue(totalRevenue)
                .totalOrders(totalOrders)
                .averageOrderValue(averageOrderValue)
                .build();
    }

    /**
     * Tính toán báo cáo tài chính tổng hợp
     *
     * <p>Công thức:
     *
     * <ul>
     *   <li>Tổng thu = Tổng doanh thu từ các đơn hàng đã thanh toán (OrderItem.finalPrice) - bỏ giá
     *       ship của đơn
     *   <li>Tổng chi = Giá gốc sản phẩm + Chi phí phát sinh do hoàn hàng và lỗi do cửa hàng
     *       <ul>
     *         <li>Giá gốc sản phẩm = sum của (purchasePrice × quantity) cho tất cả OrderItem
     *         <li>Chi phí phát sinh = sum của FinancialRecord có type là REFUND hoặc COMPENSATION
     *       </ul>
     *   <li>Lợi nhuận = Tổng thu - Tổng chi
     * </ul>
     */
    public FinancialSummary summary(LocalDate start, LocalDate end) {
        LocalDateTime[] range = toDateTimeRange(start, end);
        
        // Đảm bảo tất cả đơn hàng đã thanh toán đều có FinancialRecord
        ensureAllPaidOrdersHaveRevenueRecords(range[0], range[1]);

        // Lọc các đơn hàng đã thanh toán thành công
        List<Order> paidOrders = getPaidOrdersInRange(range[0], range[1]);

        // Tổng thu = Tổng doanh thu từ các đơn hàng đã thanh toán (OrderItem.finalPrice) - bỏ giá
        // ship của đơn
        // OrderItem.finalPrice chỉ chứa giá sản phẩm, không bao gồm shipping fee
        double income = calculateTotalRevenue(paidOrders);
        log.debug("Financial report - Total income (revenue): {}", income);
        log.debug("Financial report - Number of paid orders: {}", paidOrders.size());

        // Giá gốc sản phẩm = sum của (purchasePrice × quantity) cho tất cả OrderItem
        // Lưu ý: Nếu purchasePrice là null hoặc <= 0, sẽ tính = 0 (không có giá gốc)
        // Điều này có thể dẫn đến lợi nhuận không chính xác nếu sản phẩm chưa được set purchasePrice
        AtomicInteger itemsWithoutPurchasePrice = new AtomicInteger(0);
        AtomicInteger totalItemsCount = new AtomicInteger(0);
        double costOfGoodsSold =
                paidOrders.stream()
                        .flatMap(order -> order.getItems().stream())
                        .filter(
                                item -> {
                                    totalItemsCount.incrementAndGet();
                                    return item.getProduct() != null
                                            && item.getQuantity() != null
                                            && item.getQuantity() > 0;
                                })
                        .mapToDouble(
                                item -> {
                                    // Nếu purchasePrice là null hoặc <= 0, tính = 0
                                    Double purchasePrice =
                                            item.getProduct().getPurchasePrice();
                                    double price =
                                            (purchasePrice != null && purchasePrice > 0)
                                                    ? purchasePrice
                                                    : 0.0;
                                    int quantity = item.getQuantity();
                                    double cost = price * quantity;

                                    // Đếm số item không có purchasePrice để log warning sau
                                    if (purchasePrice == null || purchasePrice <= 0) {
                                        itemsWithoutPurchasePrice.incrementAndGet();
                                    }

                                    return cost;
                                })
                        .sum();

        log.debug("Financial report - Cost of goods sold: {}", costOfGoodsSold);
        log.debug(
                "Financial report - Total items processed: {}", totalItemsCount.get());

        // Log warning nếu có sản phẩm không có purchasePrice
        if (itemsWithoutPurchasePrice.get() > 0) {
            log.warn(
                    "Financial report: {} out of {} order items have no purchase price set. Cost calculated as 0 for these items. "
                            + "Please update purchase price for products to get accurate profit calculation.",
                    itemsWithoutPurchasePrice.get(),
                    totalItemsCount.get());
        }

        // Chi phí phát sinh = sum của FinancialRecord có type là REFUND hoặc COMPENSATION
        // (hoàn hàng và lỗi do cửa hàng)
        List<FinancialRecord> records =
                financialRecordRepository.findByOccurredAtBetween(range[0], range[1]);
        double expense =
                records.stream()
                        .filter(
                                fr -> fr.getAmount() != null
                                        && (fr.getRecordType()
                                                        == FinancialRecordType.REFUND
                                                || fr.getRecordType()
                                                        == FinancialRecordType.COMPENSATION))
                        .mapToDouble(fr -> Math.abs(fr.getAmount())) // Lấy giá trị tuyệt đối vì đây là
                        // chi phí
                        .sum();
        log.debug("Financial report - Other expenses (refunds/compensations): {}", expense);

        // Tổng chi = Giá gốc sản phẩm + Chi phí phát sinh do hoàn hàng và lỗi do cửa hàng
        double totalExpense = costOfGoodsSold + expense;
        log.debug(
                "Financial report - Total expense: {} (cost of goods: {} + other expenses: {})",
                totalExpense,
                costOfGoodsSold,
                expense);

        // Lợi nhuận = Tổng thu - Tổng chi
        double profit = income - totalExpense;
        log.info(
                "Financial report summary - Income: {}, Expense: {}, Profit: {}",
                income,
                totalExpense,
                profit);

        return FinancialSummary.builder()
                .totalIncome(income)
                .totalExpense(totalExpense)
                .profit(profit)
                .build();
    }

    /**
     * Lấy top sản phẩm bán chạy theo doanh thu trong khoảng thời gian.
     *
     * @param start Ngày bắt đầu
     * @param end Ngày kết thúc
     * @param limit Số lượng sản phẩm top (mặc định 10)
     * @return Danh sách ProductRevenue sắp xếp theo doanh thu giảm dần
     */
    public List<ProductRevenue> topProductsByRevenue(LocalDate start, LocalDate end, int limit) {
        LocalDateTime[] range = toDateTimeRange(start, end);
        
        // Đảm bảo tất cả đơn hàng đã thanh toán đều có FinancialRecord
        ensureAllPaidOrdersHaveRevenueRecords(range[0], range[1]);

        // Lọc các đơn hàng đã thanh toán thành công
        List<Order> paidOrders = getPaidOrdersInRange(range[0], range[1]);

        if (paidOrders.isEmpty()) {
            log.debug("No paid orders found in date range");
            return List.of();
        }

        // Nhóm theo productId và tính tổng quantity và revenue
        // Lưu ý: OrderItem.finalPrice đã là tổng giá cho quantity (finalPrice = unitPrice * quantity)
        Map<String, ProductRevenue> productMap =
                paidOrders.stream()
                        .flatMap(order -> order.getItems().stream())
                        .filter(this::isValidOrderItem)
                        .collect(
                                Collectors.groupingBy(
                                        item -> item.getProduct().getId(),
                                        Collectors.collectingAndThen(
                                                Collectors.toList(), this::buildProductRevenue)));

        // Sắp xếp theo doanh thu giảm dần và lấy top limit
        List<ProductRevenue> result =
                productMap.values().stream()
                        .sorted((a, b) -> Double.compare(b.getTotal(), a.getTotal()))
                        .limit(limit)
                        .collect(Collectors.toList());

        if (!result.isEmpty()) {
            log.info(
                    "Top product: {} - quantity: {}, revenue: {}",
                    result.get(0).getProductName(),
                    result.get(0).getQuantity(),
                    result.get(0).getTotal());
        }
        return result;
    }

    // Kiểm tra OrderItem có hợp lệ không (có product, finalPrice > 0, quantity > 0).
    private boolean isValidOrderItem(OrderItem item) {
        return item.getProduct() != null
                && item.getProduct().getId() != null
                && item.getProduct().getName() != null
                && item.getFinalPrice() != null
                && item.getFinalPrice() > 0
                && item.getQuantity() != null
                && item.getQuantity() > 0;
    }

    // Tính tổng quantity và revenue từ danh sách OrderItem của cùng một product.
    private ProductRevenue buildProductRevenue(List<OrderItem> items) {
        Product product = items.get(0).getProduct();
        long totalQuantity =
                items.stream().mapToLong(OrderItem::getQuantity).sum();
        // finalPrice đã là tổng cho quantity, chỉ cần sum lại
        double totalRevenue =
                items.stream().mapToDouble(OrderItem::getFinalPrice).sum();

        return ProductRevenue.builder()
                .productId(product.getId())
                .productName(product.getName())
                .quantity(totalQuantity)
                .total(totalRevenue)
                .build();
    }

    // Debug method - tạm thời để kiểm tra
    public Map<String, Object> debugOrdersInRange(LocalDate start, LocalDate end) {
        LocalDateTime[] range = toDateTimeRange(start, end);
        List<Order> allOrders = orderRepository.findByOrderDateTimeBetween(range[0], range[1], start, end);
        
        List<Map<String, Object>> orderDetails = allOrders.stream()
            .map(order -> {
                Map<String, Object> detail = new java.util.HashMap<>();
                detail.put("id", order.getId());
                detail.put("code", order.getCode());
                detail.put("status", order.getStatus() != null ? order.getStatus().name() : null);
                detail.put("paymentMethod", order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null);
                detail.put("paymentStatus", order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null);
                detail.put("paid", order.getPaid());
                detail.put("orderDateTime", order.getOrderDateTime());
                detail.put("orderDate", order.getOrderDate());
                detail.put("totalAmount", order.getTotalAmount());
                detail.put("itemsCount", order.getItems() != null ? order.getItems().size() : 0);
                detail.put("hasRevenueRecord", hasRecordedRevenue(order.getId()));
                return detail;
            })
            .collect(Collectors.toList());
        
        List<Order> paidOrders = getPaidOrdersInRange(range[0], range[1]);
        
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("dateRange", Map.of("start", start, "end", end));
        result.put("totalOrders", allOrders.size());
        result.put("paidOrdersCount", paidOrders.size());
        result.put("orders", orderDetails);
        return result;
    }
}
