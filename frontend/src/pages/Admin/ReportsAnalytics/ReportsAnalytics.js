import React, { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './ReportsAnalytics.module.scss';
import RevenueReportsPage from './RevenueReports';
import OrderReportsPage from './OrderReports';
import FinancialReportsPage from './FinancialReports';
import TopSellingPage from './TopSelling/TopSellingPage';

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

// Helper functions for date formatting
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};

const formatDateToWeek = (date) => {
    const year = date.getFullYear();
    const week = getWeekNumber(date).toString().padStart(2, '0');
    return `${year}-W${week}`;
};

const formatDateToMonth = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
};

const weekToDateRange = (weekStr) => {
    // weekStr format: "2024-W01"
    const [year, weekPart] = weekStr.split('-W');
    const week = parseInt(weekPart, 10);
    
    // Calculate the first day of the week (Monday)
    const jan4 = new Date(parseInt(year, 10), 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
    
    const startDate = new Date(firstMonday);
    startDate.setDate(firstMonday.getDate() + (week - 1) * 7);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
    };
};

const monthToDateRange = (monthStr) => {
    // monthStr format: "2024-01"
    const [year, month] = monthStr.split('-');
    const startDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const endDate = new Date(parseInt(year, 10), parseInt(month, 10), 0); // Last day of month
    
    return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
    };
};

// Format display in Vietnamese
const formatWeekDisplay = (weekStr) => {
    if (!weekStr) return '';
    const { start } = weekToDateRange(weekStr);
    const startDate = new Date(start);
    
    // Tính tuần trong tháng (1-5)
    const dayOfMonth = startDate.getDate();
    const weekOfMonth = Math.ceil(dayOfMonth / 7);
    const month = startDate.getMonth() + 1;
    const year = startDate.getFullYear();
    
    return `Tuần ${weekOfMonth}/${month}/${year}`;
};

const formatMonthDisplay = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${month}/${year}`;
};

function ReportsAnalytics() {
    const [activeTab, setActiveTab] = useState(TABS.REVENUE);
    const [timeMode, setTimeMode] = useState(TIME_MODES.DAY);
    const [loading, setLoading] = useState(false);
    
    // Date range state
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        const start = lastMonth.toISOString().split('T')[0];
        const end = today.toISOString().split('T')[0];
        console.log('ReportsAnalytics: Initial dateRange', { start, end });
        return { start, end };
    });

    // Separate state for week and month inputs
    const [weekRange, setWeekRange] = useState(() => {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        return {
            start: formatDateToWeek(lastMonth),
            end: formatDateToWeek(today)
        };
    });

    const [monthRange, setMonthRange] = useState(() => {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        return {
            start: formatDateToMonth(lastMonth),
            end: formatDateToMonth(today)
        };
    });

    // Update dateRange when week/month changes
    useEffect(() => {
        if (timeMode === TIME_MODES.WEEK && weekRange.start && weekRange.end) {
            const startRange = weekToDateRange(weekRange.start);
            const endRange = weekToDateRange(weekRange.end);
            setDateRange({
                start: startRange.start,
                end: endRange.end
            });
        } else if (timeMode === TIME_MODES.MONTH && monthRange.start && monthRange.end) {
            const startRange = monthToDateRange(monthRange.start);
            const endRange = monthToDateRange(monthRange.end);
            setDateRange({
                start: startRange.start,
                end: endRange.end
            });
        }
    }, [timeMode, weekRange, monthRange]);

    useEffect(() => {
        console.log('ReportsAnalytics: dateRange changed', dateRange);
    }, [dateRange]);

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
                    {/* Date filters based on time mode */}
                    {timeMode === TIME_MODES.DAY && (
                        <>
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
                        </>
                    )}

                    {timeMode === TIME_MODES.WEEK && (
                        <>
                            <div className={cx('filterGroup')}>
                                <label>Từ tuần:</label>
                                <div className={cx('customDateInput')}>
                                    <input
                                        type="week"
                                        value={weekRange.start}
                                        onChange={(e) => setWeekRange({ ...weekRange, start: e.target.value })}
                                        className={cx('hiddenInput')}
                                    />
                                    <span className={cx('displayValue')}>{formatWeekDisplay(weekRange.start)}</span>
                                </div>
                            </div>
                            <div className={cx('filterGroup')}>
                                <label>Đến tuần:</label>
                                <div className={cx('customDateInput')}>
                                    <input
                                        type="week"
                                        value={weekRange.end}
                                        onChange={(e) => setWeekRange({ ...weekRange, end: e.target.value })}
                                        className={cx('hiddenInput')}
                                    />
                                    <span className={cx('displayValue')}>{formatWeekDisplay(weekRange.end)}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {timeMode === TIME_MODES.MONTH && (
                        <>
                            <div className={cx('filterGroup')}>
                                <label>Từ tháng:</label>
                                <div className={cx('customDateInput')}>
                                    <input
                                        type="month"
                                        value={monthRange.start}
                                        onChange={(e) => setMonthRange({ ...monthRange, start: e.target.value })}
                                        className={cx('hiddenInput')}
                                    />
                                    <span className={cx('displayValue')}>{formatMonthDisplay(monthRange.start)}</span>
                                </div>
                            </div>
                            <div className={cx('filterGroup')}>
                                <label>Đến tháng:</label>
                                <div className={cx('customDateInput')}>
                                    <input
                                        type="month"
                                        value={monthRange.end}
                                        onChange={(e) => setMonthRange({ ...monthRange, end: e.target.value })}
                                        className={cx('hiddenInput')}
                                    />
                                    <span className={cx('displayValue')}>{formatMonthDisplay(monthRange.end)}</span>
                                </div>
                            </div>
                        </>
                    )}
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
                {activeTab === TABS.REVENUE && (
                    <RevenueReportsPage 
                        dateRange={dateRange} 
                        timeMode={timeMode} 
                        loading={loading} 
                        setLoading={setLoading} 
                    />
                )}
                {activeTab === TABS.ORDERS && (
                    <OrderReportsPage 
                        dateRange={dateRange} 
                        loading={loading} 
                        setLoading={setLoading} 
                    />
                )}
                {activeTab === TABS.FINANCIAL && (
                    <FinancialReportsPage 
                        dateRange={dateRange} 
                        loading={loading} 
                        setLoading={setLoading} 
                    />
                )}
                {activeTab === TABS.TOP_SELLERS && (
                    <TopSellingPage 
                        dateRange={dateRange} 
                        loading={loading} 
                        setLoading={setLoading} 
                    />
                )}
            </div>
        </div>
    );
}

export default ReportsAnalytics;
