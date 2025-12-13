import React from 'react';
import classNames from 'classnames/bind';
import styles from './OrderReportsPage.module.scss';
import financialService from '~/services/financial';
import { getDateRange } from '~/services/utils';

const cx = classNames.bind(styles);

function OrderReportsPage({ timeMode = 'day', customDateRange = null }) {
    const [orderStatistics, setOrderStatistics] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const { start, end } = getDateRange(timeMode, customDateRange);
                console.log('OrderReports: Fetching data', { start, end });
                
                const stats = await financialService.getOrderStatistics(start, end);
                console.log('OrderReports: API Response', stats);
                
                setOrderStatistics(stats || { totalOrders: 0, cancelledOrders: 0, refundedOrders: 0 });
            } catch (err) {
                console.error('Error fetching order reports:', err);
                setOrderStatistics({ totalOrders: 0, cancelledOrders: 0, refundedOrders: 0 });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [timeMode, customDateRange]);

    const formatNumber = (num) => {
        return new Intl.NumberFormat('vi-VN').format(num || 0);
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
}

export default OrderReportsPage;

