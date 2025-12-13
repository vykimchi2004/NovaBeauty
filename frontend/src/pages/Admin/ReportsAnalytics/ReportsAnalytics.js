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
