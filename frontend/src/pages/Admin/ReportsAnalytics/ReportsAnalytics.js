import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './ReportsAnalytics.module.scss';
import financialService from '~/services/financial';

const cx = classNames.bind(styles);

const TABS = {
    REVENUE: 'revenue',
    ORDERS: 'orders',
    FINANCIAL: 'financial',
    TOP_SELLERS: 'top_sellers',
};

const TIME_MODES = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
};

function ReportsAnalytics() {
    const [activeTab, setActiveTab] = useState(TABS.REVENUE);
    const [timeMode, setTimeMode] = useState(TIME_MODES.DAY);
    const [loading, setLoading] = useState(false);
    
    // Date range state
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Revenue data
    const [revenueSummary, setRevenueSummary] = useState(null);
    const [revenueByDay, setRevenueByDay] = useState([]);
    const [revenueByPayment, setRevenueByPayment] = useState([]);
    
    // Order data
    const [orderStatistics, setOrderStatistics] = useState(null);
    
    // Financial data
    const [financialSummary, setFinancialSummary] = useState(null);
    
    // Top products
    const [topProducts, setTopProducts] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { start, end } = dateRange;

            if (activeTab === TABS.REVENUE) {
                const [summary, byDay, byPayment] = await Promise.all([
                    financialService.getRevenueSummary(start, end),
                    financialService.getRevenueByDay(start, end, timeMode),
                    financialService.getRevenueByPayment(start, end)
                ]);
                setRevenueSummary(summary);
                setRevenueByDay(byDay || []);
                setRevenueByPayment(byPayment || []);
            } else if (activeTab === TABS.ORDERS) {
                const stats = await financialService.getOrderStatistics(start, end);
                setOrderStatistics(stats);
            } else if (activeTab === TABS.FINANCIAL) {
                const summary = await financialService.getFinancialSummary(start, end);
                setFinancialSummary(summary);
            } else if (activeTab === TABS.TOP_SELLERS) {
                const products = await financialService.getRevenueByProduct(start, end);
                setTopProducts(products || []);
            }
        } catch (err) {
            console.error('Error fetching reports:', err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, dateRange, timeMode]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatPrice = (price) => {
        const value = Math.round(Number(price) || 0);
        if (value >= 1000000000) {
            return (value / 1000000000).toFixed(2) + ' tỷ đ';
        }
        return (
            new Intl.NumberFormat('vi-VN', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(value) + ' ₫'
        );
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('vi-VN').format(num || 0);
    };

    // Chart component for revenue line chart
    const RevenueChart = ({ data }) => {
        if (!data || data.length === 0) {
            return (
                <div className={cx('chartEmpty')}>
                    <p>Không có dữ liệu để hiển thị</p>
                </div>
            );
        }

        const width = 800;
        const height = 300;
        const padding = { top: 20, right: 40, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const values = data.map(item => item.total || 0);
        const maxValue = Math.max(...values, 1);
        const minValue = Math.min(...values, 0);

        const xScale = (index) => {
            return padding.left + (index / (data.length - 1 || 1)) * chartWidth;
        };

        const yScale = (value) => {
            const range = maxValue - minValue || 1;
            return padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
        };

        // Generate path for line
        const pathData = data
            .map((item, index) => {
                const x = xScale(index);
                const y = yScale(item.total || 0);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');

        // Generate area path
        const areaPath = `${pathData} L ${xScale(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

        // Format date labels
        const formatDateLabel = (item) => {
            if (item.dateTime) {
                return new Date(item.dateTime).toLocaleDateString('vi-VN', { 
                    day: '2-digit', 
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            if (item.date) {
                return new Date(item.date).toLocaleDateString('vi-VN', { 
                    day: '2-digit', 
                    month: '2-digit' 
                });
            }
            return '-';
        };

        return (
            <div className={cx('chartContainer')}>
                <svg width={width} height={height} className={cx('chart')}>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = padding.top + chartHeight - (ratio * chartHeight);
                        const value = minValue + (maxValue - minValue) * (1 - ratio);
                        return (
                            <g key={ratio}>
                                <line
                                    x1={padding.left}
                                    y1={y}
                                    x2={width - padding.right}
                                    y2={y}
                                    stroke="#e0e0e0"
                                    strokeWidth="1"
                                    strokeDasharray="4,4"
                                />
                                <text
                                    x={padding.left - 10}
                                    y={y + 4}
                                    textAnchor="end"
                                    fontSize="12"
                                    fill="#666"
                                >
                                    {formatPrice(value)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Area under line */}
                    <path
                        d={areaPath}
                        fill="url(#gradient)"
                        opacity="0.3"
                    />

                    {/* Gradient definition */}
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#e5677d" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#e5677d" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>

                    {/* Line */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke="#e5677d"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Data points */}
                    {data.map((item, index) => {
                        const x = xScale(index);
                        const y = yScale(item.total || 0);
                        return (
                            <g key={index}>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="5"
                                    fill="#e5677d"
                                    stroke="#fff"
                                    strokeWidth="2"
                                />
                                {/* Tooltip on hover */}
                                <title>
                                    {formatDateLabel(item)}: {formatPrice(item.total || 0)}
                                </title>
                            </g>
                        );
                    })}

                    {/* X-axis labels */}
                    {data.map((item, index) => {
                        if (data.length > 10 && index % Math.ceil(data.length / 8) !== 0) return null;
                        const x = xScale(index);
                        return (
                            <text
                                key={index}
                                x={x}
                                y={height - padding.bottom + 20}
                                textAnchor="middle"
                                fontSize="11"
                                fill="#666"
                            >
                                {formatDateLabel(item)}
                            </text>
                        );
                    })}
                </svg>
            </div>
        );
    };

    // KPI Cards Component
    const KPICard = ({ title, value }) => (
        <div className={cx('kpiCard')}>
            <div className={cx('kpiContent')}>
                <div className={cx('kpiTitle')}>{title}</div>
                <div className={cx('kpiValue')}>{value}</div>
            </div>
        </div>
    );

    // Render Revenue Report Tab
    const renderRevenueReport = () => (
        <div className={cx('tabContent')}>
            <div className={cx('tabHeader')}>
                <h3 className={cx('tabTitle')}>Báo cáo doanh thu</h3>
                <p className={cx('tabSubtitle')}>Tổng quan doanh thu theo thời gian</p>
            </div>

            {loading ? (
                <div className={cx('loading')}>Đang tải dữ liệu...</div>
            ) : (
                <>
                    <div className={cx('kpiGrid')}>
                        <KPICard
                            title="Tổng doanh thu"
                            value={formatPrice(revenueSummary?.totalRevenue || 0)}
                        />
                        <KPICard
                            title="Tổng đơn hàng"
                            value={formatNumber(revenueSummary?.totalOrders || 0)}
                        />
                        <KPICard
                            title="Giá trị trung bình"
                            value={formatPrice(revenueSummary?.averageOrderValue || 0)}
                        />
                    </div>

                    <div className={cx('chartSection')}>
                        <RevenueChart data={revenueByDay} />
                    </div>

                    <div className={cx('reportSection')}>
                        <h4>Chi tiết doanh thu theo {timeMode === TIME_MODES.DAY ? 'ngày' : timeMode === TIME_MODES.WEEK ? 'tuần' : 'tháng'}</h4>
                        <div className={cx('tableWrapper')}>
                            <table className={cx('table')}>
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Thời gian</th>
                                        <th>Doanh thu</th>
                                        <th>Tỷ lệ (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {revenueByDay.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className={cx('empty')}>Không có dữ liệu</td>
                                        </tr>
                                    ) : (
                                        (() => {
                                            const totalRevenue = revenueByDay.reduce((sum, item) => sum + (item.total || 0), 0);
                                            return revenueByDay.map((item, index) => {
                                                const percentage = totalRevenue > 0 
                                                    ? ((item.total || 0) / totalRevenue * 100).toFixed(2)
                                                    : '0.00';
                                                
                                                // Format date label
                                                let dateLabel = '-';
                                                if (item.dateTime) {
                                                    dateLabel = new Date(item.dateTime).toLocaleDateString('vi-VN', { 
                                                        day: '2-digit', 
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
                                                } else if (item.date) {
                                                    if (timeMode === TIME_MODES.MONTH) {
                                                        dateLabel = new Date(item.date).toLocaleDateString('vi-VN', { 
                                                            month: '2-digit',
                                                            year: 'numeric'
                                                        });
                                                    } else if (timeMode === TIME_MODES.WEEK) {
                                                        const date = new Date(item.date);
                                                        const weekStart = new Date(date);
                                                        weekStart.setDate(date.getDate() - date.getDay());
                                                        const weekEnd = new Date(weekStart);
                                                        weekEnd.setDate(weekStart.getDate() + 6);
                                                        dateLabel = `${weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
                                                    } else {
                                                        dateLabel = new Date(item.date).toLocaleDateString('vi-VN', { 
                                                            day: '2-digit', 
                                                            month: '2-digit',
                                                            year: 'numeric'
                                                        });
                                                    }
                                                }
                                                
                                                return (
                                                    <tr key={index}>
                                                        <td>{index + 1}</td>
                                                        <td>{dateLabel}</td>
                                                        <td className={cx('priceCell')}>{formatPrice(item.total || 0)}</td>
                                                        <td>{percentage}%</td>
                                                    </tr>
                                                );
                                            });
                                        })()
                                    )}
                                </tbody>
                                {revenueByDay.length > 0 && (
                                    <tfoot>
                                        <tr className={cx('totalRow')}>
                                            <td colSpan="2"><strong>Tổng cộng</strong></td>
                                            <td className={cx('priceCell')}>
                                                <strong>{formatPrice(revenueByDay.reduce((sum, item) => sum + (item.total || 0), 0))}</strong>
                                            </td>
                                            <td><strong>100%</strong></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    <div className={cx('reportSection')}>
                        <h4>Doanh thu theo phương thức thanh toán</h4>
                        <div className={cx('tableWrapper')}>
                            <table className={cx('table')}>
                                <thead>
                                    <tr>
                                        <th>Phương thức</th>
                                        <th>Doanh thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {revenueByPayment.length === 0 ? (
                                        <tr>
                                            <td colSpan="2" className={cx('empty')}>Không có dữ liệu</td>
                                        </tr>
                                    ) : (
                                        revenueByPayment.map((item, index) => {
                                            const paymentMethodName = item.paymentMethod || '-';
                                            const displayName = paymentMethodName === 'MOMO' 
                                                ? 'Thanh toán qua MoMo' 
                                                : paymentMethodName === 'COD' 
                                                ? 'Thanh toán khi nhận hàng (COD)'
                                                : paymentMethodName;
                                            return (
                                                <tr key={index}>
                                                    <td>{displayName}</td>
                                                    <td className={cx('priceCell')}>{formatPrice(item.total || 0)}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    // Render Order Report Tab
    const renderOrderReport = () => (
        <div className={cx('tabContent')}>
            <div className={cx('tabHeader')}>
                <h3 className={cx('tabTitle')}>Báo cáo đơn hàng</h3>
                <p className={cx('tabSubtitle')}>Thống kê đơn hàng trong khoảng thời gian</p>
            </div>

            {loading ? (
                <div className={cx('loading')}>Đang tải dữ liệu...</div>
            ) : (
                <div className={cx('kpiGrid')}>
                    <KPICard
                        title="Tổng đơn hàng"
                        value={formatNumber(orderStatistics?.totalOrders || 0)}
                    />
                    <KPICard
                        title="Đơn hàng bị hủy"
                        value={formatNumber(orderStatistics?.cancelledOrders || 0)}
                    />
                    <KPICard
                        title="Đơn hàng hoàn tiền"
                        value={formatNumber(orderStatistics?.refundedOrders || 0)}
                    />
                </div>
            )}
        </div>
    );

    // Render Financial Report Tab
    const renderFinancialReport = () => (
        <div className={cx('tabContent')}>
            <div className={cx('tabHeader')}>
                <h3 className={cx('tabTitle')}>Báo cáo tài chính</h3>
                <p className={cx('tabSubtitle')}>Tổng quan tài chính</p>
            </div>

            {loading ? (
                <div className={cx('loading')}>Đang tải dữ liệu...</div>
            ) : (
                <>
                    <div className={cx('kpiGrid')}>
                        <KPICard
                            title="Tổng thu"
                            value={formatPrice(financialSummary?.totalIncome || 0)}
                        />
                        <KPICard
                            title="Tổng chi"
                            value={formatPrice(financialSummary?.totalExpense || 0)}
                        />
                        <KPICard
                            title="Lợi nhuận"
                            value={formatPrice(financialSummary?.profit || 0)}
                        />
                    </div>

                    <div className={cx('reportSection')}>
                        <h4>Chi tiết tài chính</h4>
                        <div className={cx('tableWrapper')}>
                            <table className={cx('table')}>
                                <thead>
                                    <tr>
                                        <th>Chỉ tiêu</th>
                                        <th>Giá trị</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Tổng thu (Từ đơn hàng)</td>
                                        <td className={cx('priceCell')}>{formatPrice(financialSummary?.totalIncome || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td>Tổng chi (Hoàn tiền, bồi thường)</td>
                                        <td className={cx('priceCell')}>{formatPrice(financialSummary?.totalExpense || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Lợi nhuận ròng</strong></td>
                                        <td className={cx('priceCell')}><strong>{formatPrice(financialSummary?.profit || 0)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    // Render Top Sellers Tab
    const renderTopSellers = () => (
        <div className={cx('tabContent')}>
            <div className={cx('tabHeader')}>
                <h3 className={cx('tabTitle')}>Top bán chạy</h3>
                <p className={cx('tabSubtitle')}>Sản phẩm bán chạy nhất</p>
            </div>

            {loading ? (
                <div className={cx('loading')}>Đang tải dữ liệu...</div>
            ) : (
                <div className={cx('reportSection')}>
                    <div className={cx('tableWrapper')}>
                        <table className={cx('table')}>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Sản phẩm</th>
                                    <th>Doanh thu</th>
                                    <th>Số lượng bán</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className={cx('empty')}>Không có dữ liệu</td>
                                    </tr>
                                ) : (
                                    topProducts.map((item, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{item.productName || '-'}</td>
                                            <td className={cx('priceCell')}>{formatPrice(item.total || 0)}</td>
                                            <td>{formatNumber(item.quantity || 0)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h2 className={cx('title')}>Báo cáo và doanh thu</h2>
                <div className={cx('filters')}>
                    <div className={cx('filterGroup')}>
                        <label>Thống kê theo:</label>
                        <select
                            value={timeMode}
                            onChange={(e) => setTimeMode(e.target.value)}
                            className={cx('select')}
                        >
                            <option value={TIME_MODES.DAY}>Theo ngày</option>
                            <option value={TIME_MODES.WEEK}>Theo tuần</option>
                            <option value={TIME_MODES.MONTH}>Theo tháng</option>
                        </select>
                    </div>
                    <div className={cx('filterGroup')}>
                        <label>Từ ngày:</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className={cx('dateInput')}
                        />
                    </div>
                    <div className={cx('filterGroup')}>
                        <label>Đến ngày:</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className={cx('dateInput')}
                        />
                    </div>
                </div>
            </div>

            <div className={cx('tabs')}>
                <button
                    className={cx('tab', { active: activeTab === TABS.REVENUE })}
                    onClick={() => setActiveTab(TABS.REVENUE)}
                >
                    Báo cáo doanh thu
                </button>
                <button
                    className={cx('tab', { active: activeTab === TABS.ORDERS })}
                    onClick={() => setActiveTab(TABS.ORDERS)}
                >
                    Báo cáo đơn hàng
                </button>
                <button
                    className={cx('tab', { active: activeTab === TABS.FINANCIAL })}
                    onClick={() => setActiveTab(TABS.FINANCIAL)}
                >
                    Báo cáo tài chính
                </button>
                <button
                    className={cx('tab', { active: activeTab === TABS.TOP_SELLERS })}
                    onClick={() => setActiveTab(TABS.TOP_SELLERS)}
                >
                    Top bán chạy
                </button>
            </div>

            <div className={cx('content')}>
                {activeTab === TABS.REVENUE && renderRevenueReport()}
                {activeTab === TABS.ORDERS && renderOrderReport()}
                {activeTab === TABS.FINANCIAL && renderFinancialReport()}
                {activeTab === TABS.TOP_SELLERS && renderTopSellers()}
            </div>
        </div>
    );
}

export default ReportsAnalytics;
