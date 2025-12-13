import React from 'react';
import classNames from 'classnames/bind';
import styles from './RevenueReportsPage.module.scss';
import financialService from '~/services/financial';

const cx = classNames.bind(styles);

const TIME_MODES = {
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
};

function RevenueReportsPage({ dateRange, timeMode, loading, setLoading }) {
    const [revenueSummary, setRevenueSummary] = React.useState(null);
    const [revenueByDay, setRevenueByDay] = React.useState([]);
    const [revenueByPayment, setRevenueByPayment] = React.useState([]);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!dateRange || !dateRange.start || !dateRange.end) {
                console.warn('RevenueReports: Missing dateRange', dateRange);
                return;
            }
            
            try {
                if (setLoading) setLoading(true);
                const { start, end } = dateRange;
                console.log('RevenueReports: Fetching data', { start, end, timeMode });
                
                const [summary, byDay, byPayment] = await Promise.all([
                    financialService.getRevenueSummary(start, end),
                    financialService.getRevenueByDay(start, end, timeMode),
                    financialService.getRevenueByPayment(start, end)
                ]);
                
                console.log('RevenueReports: API Response', { summary, byDay, byPayment });
                
                // Kiểm tra và log nếu dữ liệu null
                if (!summary) {
                    console.warn('RevenueReports: summary is null or undefined');
                }
                if (!byDay || byDay.length === 0) {
                    console.warn('RevenueReports: byDay is empty');
                }
                if (!byPayment || byPayment.length === 0) {
                    console.warn('RevenueReports: byPayment is empty');
                }
                
                setRevenueSummary(summary);
                setRevenueByDay(byDay || []);
                setRevenueByPayment(byPayment || []);
            } catch (err) {
                console.error('Error fetching revenue reports:', err);
                setRevenueSummary(null);
                setRevenueByDay([]);
                setRevenueByPayment([]);
            } finally {
                if (setLoading) setLoading(false);
            }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange?.start, dateRange?.end, timeMode]);

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

    return (
        <div className={cx('tabContent')}>
            <div className={cx('tabHeader')}>
                <h3 className={cx('tabTitle')}>Báo cáo doanh thu</h3>
                <p className={cx('tabSubtitle')}>Tổng quan doanh thu theo thời gian</p>
            </div>

            {loading ? (
                <div className={cx('loading')}>Đang tải dữ liệu...</div>
            ) : (!revenueSummary || (revenueSummary.totalRevenue === 0 && revenueSummary.totalOrders === 0)) && revenueByDay.length === 0 && revenueByPayment.length === 0 ? (
                <div className={cx('emptyState')}>
                    <p className={cx('emptyMessage')}>
                        Không có dữ liệu doanh thu trong khoảng thời gian đã chọn.
                    </p>
                    <p className={cx('emptyHint')}>
                        <strong>Lưu ý:</strong> Hệ thống chỉ tính doanh thu từ các đơn hàng đã thanh toán thành công:
                        <br />- COD: Đơn hàng đã được giao thành công (DELIVERED)
                        <br />- MoMo: Đơn hàng đã thanh toán và được xác nhận (CONFIRMED)
                    </p>
                </div>
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
}

export default RevenueReportsPage;

