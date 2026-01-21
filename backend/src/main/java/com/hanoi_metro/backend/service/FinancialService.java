package com.hanoi_metro.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hanoi_metro.backend.dto.response.FinancialSummary;
import com.hanoi_metro.backend.dto.response.PaymentRevenue;
import com.hanoi_metro.backend.dto.response.ProductRevenue;
import com.hanoi_metro.backend.dto.response.RevenuePoint;
import com.hanoi_metro.backend.dto.response.RevenueSummary;
import com.hanoi_metro.backend.entity.FinancialRecord;
import com.hanoi_metro.backend.entity.Order;
import com.hanoi_metro.backend.entity.OrderItem;
import com.hanoi_metro.backend.entity.Product;
import com.hanoi_metro.backend.enums.FinancialRecordType;
import com.hanoi_metro.backend.enums.OrderStatus;
import com.hanoi_metro.backend.enums.PaymentMethod;
import com.hanoi_metro.backend.enums.PaymentStatus;
import com.hanoi_metro.backend.repository.FinancialRecordRepository;
import com.hanoi_metro.backend.repository.OrderRepository;

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
    // - MoMo: chỉ tính khi đơn hàng đã được giao thành công (status = DELIVERED)
    // Tất cả các phương thức thanh toán đều phải có status = DELIVERED mới được tính vào báo cáo
    private List<Order> getPaidOrdersInRange(LocalDateTime start, LocalDateTime end) {
        List<Order> allOrders = orderRepository.findByOrderDateTimeBetween(start, end);
        return allOrders.stream()
                .filter(
                        order -> {
                            // Kiểm tra điều kiện cơ bản: đã thanh toán và có items
                            if (order.getPaymentStatus() != PaymentStatus.PAID
                                    || !Boolean.TRUE.equals(order.getPaid())
                                    || order.getItems() == null
                                    || order.getItems().isEmpty()) {
                                return false;
                            }

                            // Tất cả các phương thức thanh toán (COD, MoMo, và các phương thức khác)
                            // đều phải có status = DELIVERED mới được tính vào báo cáo
                            // Lý do: chỉ tính các đơn đã giao thành công để đảm bảo tính chính xác của báo cáo
                            return order.getStatus() == OrderStatus.DELIVERED;
                        })
                .toList();
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
        // Kiểm tra xem đã có FinancialRecord cho order và product này chưa (tránh duplicate)
        // Mỗi order + product chỉ nên có 1 FinancialRecord ORDER_PAYMENT
        List<FinancialRecord> existingRecords = financialRecordRepository
                .findByOrderIdAndRecordType(order.getId(), FinancialRecordType.ORDER_PAYMENT);
        
        // Kiểm tra xem có FinancialRecord cho product cụ thể này chưa
        boolean productExists = existingRecords.stream()
                .anyMatch(record -> record.getProduct() != null 
                        && record.getProduct().getId() != null
                        && record.getProduct().getId().equals(product.getId()));
        
        if (productExists) {
            log.warn("FinancialRecord already exists for order {} and product {}, skipping", 
                    order.getId(), product.getId());
            return;
        }
        
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
        log.info("Created FinancialRecord for order {} product {} amount {} (order status: {})", 
                order.getId(), product.getId(), amount, order.getStatus());
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

    // Xử lý lại doanh thu cho đơn MoMo đã DELIVERED (cập nhật occurredAt = thời điểm DELIVERED)
    @Transactional
    public void ensureMomoOrderRevenueRecorded(Order order) {
        if (order == null
                || order.getPaymentMethod() != PaymentMethod.MOMO
                || order.getStatus() != OrderStatus.DELIVERED
                || order.getPaymentStatus() != PaymentStatus.PAID
                || !Boolean.TRUE.equals(order.getPaid())
                || order.getItems() == null
                || order.getItems().isEmpty()) {
            return;
        }

        // Lấy các FinancialRecord hiện có của order này
        List<FinancialRecord> existingRecords = financialRecordRepository
                .findByOrderIdAndRecordType(order.getId(), FinancialRecordType.ORDER_PAYMENT);

        if (existingRecords.isEmpty()) {
            // Nếu chưa có FinancialRecord, tạo mới (trường hợp IPN chưa được gọi)
            log.warn("No FinancialRecord found for MoMo order {} when delivered, creating new records", order.getId());
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() != null
                        && item.getFinalPrice() != null
                        && item.getFinalPrice() > 0) {
                    try {
                        recordRevenue(order, item.getProduct(), item.getFinalPrice(), order.getPaymentMethod());
                    } catch (Exception e) {
                        log.error("Error recording revenue for MoMo order {} product {}", 
                                order.getId(), item.getProduct().getId(), e);
                    }
                }
            }
        } else {
            // Cập nhật occurredAt của các FinancialRecord hiện có = thời điểm hiện tại (DELIVERED)
            LocalDateTime now = LocalDateTime.now();
            for (FinancialRecord record : existingRecords) {
                record.setOccurredAt(now);
                financialRecordRepository.save(record);
            }
            log.info("Updated occurredAt for {} FinancialRecords of MoMo order {} to delivery time", 
                    existingRecords.size(), order.getId());
        }
    }

    // Tính doanh thu theo đơn hàng theo timeMode
    public List<RevenuePoint> revenueByDay(LocalDate start, LocalDate end, String timeMode) {
        LocalDateTime[] range = toDateTimeRange(start, end);

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
        return financialRecordRepository
                .revenueByPayment(FinancialRecordType.ORDER_PAYMENT, range[0], range[1])
                .stream()
                .map(r -> new PaymentRevenue((PaymentMethod) r[0], ((Number) r[1]).doubleValue()))
                .toList();
    }

    // Tổng doanh thu = tổng giá trị các sản phẩm bán ra (OrderItem.finalPrice), không bao gồm shipping
    // fee
    public RevenueSummary revenueSummary(LocalDate start, LocalDate end) {
        LocalDateTime[] range = toDateTimeRange(start, end);

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
}
