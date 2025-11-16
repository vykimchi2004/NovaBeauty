import React, { useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../Profile.module.scss';

const cx = classNames.bind(styles);

// Dữ liệu mẫu đơn khiếu nại
const COMPLAINTS_DATA = [
  {
    id: 'KN12345',
    orderCode: 'FHS56789',
    dateSent: '10/10/2025',
    status: 'Đang xử lý',
    statusKey: 'processing',
  },
  {
    id: 'KN12346',
    orderCode: 'FHS56790',
    dateSent: '09/10/2025',
    status: 'Hoàn tất',
    statusKey: 'completed',
  },
  {
    id: 'KN12347',
    orderCode: 'FHS56791',
    dateSent: '08/10/2025',
    status: 'Từ chối',
    statusKey: 'rejected',
  },
];

function ComplaintSection() {
  const [complaints] = useState(COMPLAINTS_DATA);

  const getStatusClass = (statusKey) => {
    const statusMap = {
      processing: 'statusProcessing',
      completed: 'statusCompleted',
      rejected: 'statusRejected',
    };
    return statusMap[statusKey] || '';
  };

  const handleViewDetails = (complaintId) => {
    // TODO: Navigate to complaint details page
    console.log('View details for:', complaintId);
  };

  return (
    <div className={cx('card', 'complaintsCard')}>
      <div className={cx('complaintsHeader')}>
        <h2>Đơn khiếu nại</h2>
        <button type="button" className={cx('btn', 'btnPrimary', 'newComplaintBtn')}>
          Tạo đơn khiếu nại mới
        </button>
      </div>

      <div className={cx('complaintsTableWrapper')}>
        <table className={cx('complaintsTable')}>
          <thead>
            <tr>
              <th>Mã khiếu nại</th>
              <th>Đơn hàng</th>
              <th>Ngày gửi</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr>
                <td colSpan="5" className={cx('emptyTableMessage')}>
                  Bạn chưa có đơn khiếu nại nào.
                </td>
              </tr>
            ) : (
              complaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td className={cx('complaintId')}>#{complaint.id}</td>
                  <td className={cx('complaintOrder')}>#{complaint.orderCode}</td>
                  <td className={cx('complaintDate')}>{complaint.dateSent}</td>
                  <td>
                    <span className={cx('complaintStatus', getStatusClass(complaint.statusKey))}>
                      {complaint.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={cx('btn', 'btnViewDetails')}
                      onClick={() => handleViewDetails(complaint.id)}
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ComplaintSection;
