import React, { useState } from 'react';
import classNames from 'classnames/bind';
import styles from './ReportsAnalytics.module.scss';
import RevenueReportsPage from './RevenueReports';
import OrderReportsPage from './OrderReports';
import FinancialReportsPage from './FinancialReports';
import TopSellingPage from './TopSelling';

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
    YEAR: 'year',
    CUSTOM: 'custom',
};

function ReportsAnalytics() {
    const [activeTab, setActiveTab] = useState(TABS.REVENUE);
    const [timeMode, setTimeMode] = useState(TIME_MODES.DAY);
    const [customDateRange, setCustomDateRange] = useState({
        start: '',
        end: ''
    });

    const handleTimeModeChange = (e) => {
        setTimeMode(e.target.value);
        // Reset custom date range khi đổi mode
        if (e.target.value !== TIME_MODES.CUSTOM) {
            setCustomDateRange({ start: '', end: '' });
        }
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h2 className={cx('title')}>Báo cáo và doanh thu</h2>
                <div className={cx('filters')}>
                    <span>Thống kê theo:</span>
                    <select
                        className={cx('select')}
                        value={timeMode}
                        onChange={handleTimeModeChange}
                    >
                        <option value={TIME_MODES.DAY}>Theo ngày</option>
                        <option value={TIME_MODES.WEEK}>Theo tuần</option>
                        <option value={TIME_MODES.MONTH}>Theo tháng</option>
                        <option value={TIME_MODES.YEAR}>Theo năm</option>
                        <option value={TIME_MODES.CUSTOM}>Khoảng thời gian</option>
                    </select>
                    {timeMode === TIME_MODES.CUSTOM && (
                        <div className={cx('dateRangePicker')}>
                            <input
                                type="date"
                                className={cx('dateInput')}
                                value={customDateRange.start}
                                max={customDateRange.end || undefined}
                                onChange={(e) => {
                                    const newStart = e.target.value;
                                    // Nếu ngày bắt đầu > ngày kết thúc, tự động điều chỉnh ngày kết thúc
                                    if (customDateRange.end && newStart > customDateRange.end) {
                                        setCustomDateRange({ start: newStart, end: newStart });
                                    } else {
                                        setCustomDateRange({ ...customDateRange, start: newStart });
                                    }
                                }}
                                placeholder="Từ ngày"
                            />
                            <span className={cx('dateSeparator')}>đến</span>
                            <input
                                type="date"
                                className={cx('dateInput')}
                                value={customDateRange.end}
                                min={customDateRange.start || undefined}
                                onChange={(e) => {
                                    const newEnd = e.target.value;
                                    // Nếu ngày kết thúc < ngày bắt đầu, tự động điều chỉnh ngày bắt đầu
                                    if (customDateRange.start && newEnd < customDateRange.start) {
                                        setCustomDateRange({ start: newEnd, end: newEnd });
                                    } else {
                                        setCustomDateRange({ ...customDateRange, end: newEnd });
                                    }
                                }}
                                placeholder="Đến ngày"
                            />
                        </div>
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
                        timeMode={timeMode}
                        customDateRange={timeMode === TIME_MODES.CUSTOM ? customDateRange : null}
                    />
                )}
                {activeTab === TABS.ORDERS && (
                    <OrderReportsPage 
                        timeMode={timeMode}
                        customDateRange={timeMode === TIME_MODES.CUSTOM ? customDateRange : null}
                    />
                )}
                {activeTab === TABS.FINANCIAL && (
                    <FinancialReportsPage 
                        timeMode={timeMode}
                        customDateRange={timeMode === TIME_MODES.CUSTOM ? customDateRange : null}
                    />
                )}
                {activeTab === TABS.TOP_SELLERS && (
                    <TopSellingPage 
                        timeMode={timeMode}
                        customDateRange={timeMode === TIME_MODES.CUSTOM ? customDateRange : null}
                    />
                )}
            </div>
        </div>
    );
}

export default ReportsAnalytics;
