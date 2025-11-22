import React, { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './ReportsAnalytics.module.scss';
import financialService from '~/services/financial';

const cx = classNames.bind(styles);

function ReportsAnalytics() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [revenueByDay, setRevenueByDay] = useState([]);
  const [revenueByProduct, setRevenueByProduct] = useState([]);
  const [revenueByPayment, setRevenueByPayment] = useState([]);

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [byDay, byProduct, byPayment] = await Promise.all([
        financialService.getRevenueByDay(dateRange.start, dateRange.end),
        financialService.getRevenueByProduct(dateRange.start, dateRange.end),
        financialService.getRevenueByPayment(dateRange.start, dateRange.end)
      ]);
      setRevenueByDay(byDay || []);
      setRevenueByProduct(byProduct || []);
      setRevenueByPayment(byPayment || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    const value = Math.round(Number(price) || 0);
    return (
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' ₫'
    );
  };

  return (
    <div className={cx('wrapper')}>
      <div className={cx('header')}>
        <h2 className={cx('title')}>Báo cáo & Thống kê</h2>
        <div className={cx('dateRange')}>
          <label>Từ ngày:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <label>Đến ngày:</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>
      </div>

      {loading ? (
        <div className={cx('loading')}>Đang tải dữ liệu...</div>
      ) : (
        <div className={cx('reports')}>
          <div className={cx('reportSection')}>
            <h3>Doanh thu theo ngày</h3>
            <div className={cx('tableWrapper')}>
              <table className={cx('table')}>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueByDay.length === 0 ? (
                    <tr>
                      <td colSpan="2" className={cx('empty')}>Không có dữ liệu</td>
                    </tr>
                  ) : (
                    revenueByDay.map((item, index) => (
                      <tr key={index}>
                        <td>{item.date || '-'}</td>
                        <td className={cx('priceCell')}>{formatPrice(item.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cx('reportSection')}>
            <h3>Doanh thu theo sản phẩm</h3>
            <div className={cx('tableWrapper')}>
              <table className={cx('table')}>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Doanh thu</th>
                    <th>Số lượng bán</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueByProduct.length === 0 ? (
                    <tr>
                      <td colSpan="3" className={cx('empty')}>Không có dữ liệu</td>
                    </tr>
                  ) : (
                    revenueByProduct.map((item, index) => (
                      <tr key={index}>
                        <td>{item.productName || '-'}</td>
                        <td className={cx('priceCell')}>{formatPrice(item.revenue)}</td>
                        <td>{item.quantity || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cx('reportSection')}>
            <h3>Doanh thu theo phương thức thanh toán</h3>
            <div className={cx('tableWrapper')}>
              <table className={cx('table')}>
                <thead>
                  <tr>
                    <th>Phương thức</th>
                    <th>Doanh thu</th>
                    <th>Số giao dịch</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueByPayment.length === 0 ? (
                    <tr>
                      <td colSpan="3" className={cx('empty')}>Không có dữ liệu</td>
                    </tr>
                  ) : (
                    revenueByPayment.map((item, index) => (
                      <tr key={index}>
                        <td>{item.paymentMethod || '-'}</td>
                        <td className={cx('priceCell')}>{formatPrice(item.revenue)}</td>
                        <td>{item.count || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsAnalytics;
