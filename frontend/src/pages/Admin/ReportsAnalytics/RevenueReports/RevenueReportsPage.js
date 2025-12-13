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

        // Sắp xếp dữ liệu theo thời gian (từ sớm đến muộn)
        const sortedData = [...data].sort((a, b) => {
            const dateA = a.dateTime ? new Date(a.dateTime) : (a.date ? new Date(a.date) : new Date(0));
            const dateB = b.dateTime ? new Date(b.dateTime) : (b.date ? new Date(b.date) : new Date(0));
            return dateA.getTime() - dateB.getTime();
        });

        // Kích thước biểu đồ
        const width = 800;
        const height = 300;
        // Tăng padding.left để có đủ không gian cho nhãn Y-axis (giá trị tiền)
        const padding = { top: 20, right: 40, bottom: 50, left: 80 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Tính toán giá trị min và max
        const values = sortedData.map(item => Number(item.total) || 0);
        const actualMaxValue = values.length > 0 ? Math.max(...values) : 0;
        const actualMinValue = values.length > 0 ? Math.min(...values) : 0;
        
        // Nếu tất cả giá trị bằng nhau và > 0, dùng 0 làm min để hiển thị đầy đủ range
        let minValue = (actualMinValue === actualMaxValue && actualMaxValue > 0) ? 0 : actualMinValue;
        
        // Làm tròn maxValue lên để có padding phía trên và làm tròn đẹp
        let maxValue = actualMaxValue;
        if (maxValue > 0) {
            // Thêm 10% padding phía trên
            maxValue = maxValue * 1.1;
            // Làm tròn lên theo bậc thang đẹp
            if (maxValue >= 1000000) {
                maxValue = Math.ceil(maxValue / 100000) * 100000; // Làm tròn đến hàng trăm nghìn
            } else if (maxValue >= 100000) {
                maxValue = Math.ceil(maxValue / 10000) * 10000; // Làm tròn đến hàng chục nghìn
            } else if (maxValue >= 10000) {
                maxValue = Math.ceil(maxValue / 1000) * 1000; // Làm tròn đến hàng nghìn
            } else if (maxValue >= 1000) {
                maxValue = Math.ceil(maxValue / 100) * 100; // Làm tròn đến hàng trăm
            } else {
                maxValue = Math.ceil(maxValue / 10) * 10; // Làm tròn đến hàng chục
            }
        } else {
            maxValue = 1;
        }

        // Scale functions
        const xScale = (index) => {
            if (sortedData.length === 1) {
                return padding.left + chartWidth / 2; // Đặt ở giữa nếu chỉ có 1 điểm
            }
            return padding.left + (index / (sortedData.length - 1)) * chartWidth;
        };

        const yScale = (value) => {
            const range = maxValue - minValue;
            if (range === 0) {
                // Nếu range = 0, đặt ở giữa biểu đồ
                return padding.top + chartHeight / 2;
            }
            // Tính vị trí Y: giá trị cao hơn ở trên, giá trị thấp hơn ở dưới
            const normalizedValue = (value - minValue) / range;
            return padding.top + chartHeight - (normalizedValue * chartHeight);
        };

        // Format date label
        const formatDateLabel = (item) => {
            if (item.dateTime) {
                const date = new Date(item.dateTime);
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                return `${hours}:${minutes} ${day}-${month}`;
            }
            if (item.date) {
                const date = new Date(item.date);
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                return `${day}-${month}`;
            }
            return '-';
        };

        // Tạo đường path cho line chart
        let pathData = '';
        let areaPath = '';
        if (sortedData.length > 0) {
            const points = sortedData.map((item, index) => {
                const x = xScale(index);
                const y = yScale(item.total || 0);
                return { x, y };
            });

            // Tạo path cho đường line
            pathData = points.map((point, index) => {
                return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
            }).join(' ');

            // Tạo path cho area (vùng dưới đường line)
            if (points.length > 0) {
                const firstPoint = points[0];
                const lastPoint = points[points.length - 1];
                const bottomY = padding.top + chartHeight;
                areaPath = `${pathData} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`;
            }
        }

        // Tạo grid lines với nhãn đúng thứ tự (từ dưới lên trên: min -> max)
        const gridLines = [];
        const numGridLines = 5;
        
        for (let i = 0; i < numGridLines; i++) {
            // ratio từ 0 (dưới cùng) đến 1 (trên cùng)
            const ratio = i / (numGridLines - 1);
            // Vị trí Y: ratio = 0 ở dưới cùng, ratio = 1 ở trên cùng
            const y = padding.top + chartHeight - (ratio * chartHeight);
            // Giá trị: ratio = 0 là minValue, ratio = 1 là maxValue
            const value = minValue + (maxValue - minValue) * ratio;
            
            gridLines.push({ y, value, ratio });
        }

        return (
            <div className={cx('chartContainer')}>
                <svg 
                    width={width} 
                    height={height} 
                    className={cx('chart')}
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{ overflow: 'visible' }}
                >
                    {/* Gradient definition */}
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#e5677d" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#e5677d" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {gridLines.map((grid, index) => (
                        <g key={index}>
                                <line
                                    x1={padding.left}
                                y1={grid.y}
                                    x2={width - padding.right}
                                y2={grid.y}
                                    stroke="#e0e0e0"
                                    strokeWidth="1"
                                    strokeDasharray="4,4"
                                />
                                <text
                                    x={padding.left - 15}
                                    y={grid.y + 4}
                                    textAnchor="end"
                                    fontSize="12"
                                    fill="#666"
                                    dominantBaseline="middle"
                                >
                                    {formatPrice(grid.value)}
                                </text>
                            </g>
                    ))}

                    {/* Area under line */}
                    {areaPath && (
                    <path
                        d={areaPath}
                        fill="url(#gradient)"
                        opacity="0.3"
                    />
                    )}

                    {/* Line */}
                    {pathData && (
                    <path
                        d={pathData}
                        fill="none"
                        stroke="#e5677d"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    )}

                    {/* Data points */}
                    {sortedData.map((item, index) => {
                        const x = xScale(index);
                        const y = yScale(item.total || 0);
                        const value = item.total || 0;
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
                                {/* Value label above the point */}
                                <text
                                    x={x}
                                    y={y - 15}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fill="#333"
                                    fontWeight="500"
                                    dominantBaseline="auto"
                                >
                                    {formatPrice(value)}
                                </text>
                                {/* Tooltip on hover */}
                                <title>
                                    {formatDateLabel(item)}: {formatPrice(value)}
                                </title>
                            </g>
                        );
                    })}

                    {/* X-axis labels */}
                    {sortedData.map((item, index) => {
                        if (sortedData.length > 10 && index % Math.ceil(sortedData.length / 8) !== 0) {
                            return null;
                        }
                        const x = xScale(index);
                        return (
                            <text
                                key={index}
                                x={x}
                                y={height - padding.bottom + 25}
                                textAnchor="middle"
                                fontSize="11"
                                fill="#666"
                                dominantBaseline="hanging"
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

