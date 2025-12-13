import React from 'react';
import classNames from 'classnames/bind';
import styles from './TopSellingPage.module.scss';
import financialService from '~/services/financial';

const cx = classNames.bind(styles);

function TopSellingPage({ dateRange, loading, setLoading }) {
    const [topProducts, setTopProducts] = React.useState([]);

    React.useEffect(() => {
        const fetchData = async () => {
            if (!dateRange || !dateRange.start || !dateRange.end) {
                console.warn('TopSelling: Missing dateRange', dateRange);
                return;
            }
            
            try {
                if (setLoading) setLoading(true);
                const { start, end } = dateRange;
                console.log('TopSelling: Fetching data', { start, end });
                
                const products = await financialService.getRevenueByProduct(start, end);
                console.log('TopSelling: API Response', products);
                
                if (!products || products.length === 0) {
                    console.warn('TopSelling: products is empty');
                }
                
                setTopProducts(products || []);
            } catch (err) {
                console.error('Error fetching top selling reports:', err);
                setTopProducts([]);
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

    const formatNumber = (num) => {
        return new Intl.NumberFormat('vi-VN').format(num || 0);
    };

    return (
        <div className={cx('tabContent')}>
            <div className={cx('tabHeader')}>
                <h3 className={cx('tabTitle')}>Top bán chạy</h3>
                <p className={cx('tabSubtitle')}>Sản phẩm bán chạy nhất</p>
            </div>

            {loading ? (
                <div className={cx('loading')}>Đang tải dữ liệu...</div>
            ) : topProducts.length === 0 ? (
                <div className={cx('emptyState')}>
                    <p className={cx('emptyMessage')}>
                        Không có dữ liệu sản phẩm bán chạy trong khoảng thời gian đã chọn.
                    </p>
                    <p className={cx('emptyHint')}>
                        <strong>Lưu ý:</strong> Hệ thống chỉ tính các sản phẩm từ đơn hàng đã thanh toán thành công trong khoảng thời gian này.
                    </p>
                </div>
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
                                {topProducts.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{item.productName || '-'}</td>
                                        <td className={cx('priceCell')}>{formatPrice(item.total || 0)}</td>
                                        <td>{formatNumber(item.quantity || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TopSellingPage;

