import React from 'react';
import classNames from 'classnames/bind';
import styles from './FinancialReportsPage.module.scss';
import financialService from '~/services/financial';

const cx = classNames.bind(styles);

function FinancialReportsPage({ dateRange, loading, setLoading }) {
    const [financialSummary, setFinancialSummary] = React.useState(null);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!dateRange || !dateRange.start || !dateRange.end) {
                console.warn('FinancialReports: Missing dateRange', dateRange);
                return;
            }
            
            try {
                if (setLoading) setLoading(true);
                const { start, end } = dateRange;
                console.log('FinancialReports: Fetching data', { start, end });
                
                const summary = await financialService.getFinancialSummary(start, end);
                console.log('FinancialReports: API Response', summary);
                
                if (!summary) {
                    console.warn('FinancialReports: summary is null or undefined');
                }
                
                setFinancialSummary(summary);
            } catch (err) {
                console.error('Error fetching financial reports:', err);
                setFinancialSummary(null);
            } finally {
                if (setLoading) setLoading(false);
            }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange?.start, dateRange?.end]);

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
                <h3 className={cx('tabTitle')}>Báo cáo tài chính</h3>
                <p className={cx('tabSubtitle')}>Tổng quan tài chính</p>
            </div>

            {loading ? (
                <div className={cx('loading')}>Đang tải dữ liệu...</div>
            ) : !financialSummary ? (
                <div className={cx('emptyState')}>
                    <p className={cx('emptyMessage')}>
                        Không có dữ liệu tài chính trong khoảng thời gian đã chọn.
                    </p>
                    <p className={cx('emptyHint')}>
                        <strong>Lưu ý:</strong> Hệ thống chỉ tính các giao dịch tài chính đã được ghi nhận trong khoảng thời gian này.
                    </p>
                </div>
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
}

export default FinancialReportsPage;

