import React from 'react';
import classNames from 'classnames/bind';
import styles from './OrderReportsPage.module.scss';
import financialService from '~/services/financial';

const cx = classNames.bind(styles);

function OrderReportsPage({ dateRange, loading, setLoading }) {
    const [orderStatistics, setOrderStatistics] = React.useState(null);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!dateRange || !dateRange.start || !dateRange.end) {
                console.warn('OrderReports: Missing dateRange', dateRange);
                return;
            }
            
            try {
                if (setLoading) setLoading(true);
                const { start, end } = dateRange;
                console.log('OrderReports: Fetching data', { start, end });
                
                const stats = await financialService.getOrderStatistics(start, end);
                console.log('OrderReports: API Response', stats);
                
                setOrderStatistics(stats || { totalOrders: 0, cancelledOrders: 0, refundedOrders: 0 });
            } catch (err) {
                console.error('Error fetching order reports:', err);
                setOrderStatistics({ totalOrders: 0, cancelledOrders: 0, refundedOrders: 0 });
            } finally {
                if (setLoading) setLoading(false);
            }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange?.start, dateRange?.end]);

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

