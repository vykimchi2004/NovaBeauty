import React, { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../Profile.module.scss';
import { useNavigate } from 'react-router-dom';
import ticketService from '~/services/ticket';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';

const cx = classNames.bind(styles);

function ComplaintSection() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyComplaints = async () => {
      try {
        setLoading(true);
        setError('');
        const user = storage.get(STORAGE_KEYS.USER, null);
        const email = user?.email?.toLowerCase();
        if (!email) {
          setComplaints([]);
          return;
        }

        const tickets = await ticketService.getAllTickets();
        const myTickets = Array.isArray(tickets)
          ? tickets.filter((t) => (t.email || '').toLowerCase() === email)
          : [];

        const mapStatus = (raw) => {
          const key = (raw || '').toUpperCase();
          if (key === 'RESOLVED') return { label: 'Hoàn tất', key: 'completed' };
          if (key === 'PENDING' || key === 'IN_PROGRESS' || key === 'ESCALATED') {
            return { label: 'Đang xử lý', key: 'processing' };
          }
          return { label: raw || 'Không xác định', key: 'processing' };
        };

        const formatDate = (value) => {
          if (!value) return '';
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return '';
          return d.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
        };

        const mapped = myTickets.map((t) => {
          const s = mapStatus(t.status);
          // Nếu orderCode là 'KHAC' (Khác), hiển thị "-" thay vì "KHAC"
          const displayOrderCode = t.orderCode === 'KHAC' ? '-' : (t.orderCode || '-');
          return {
            id: t.id || '',
            orderCode: displayOrderCode,
            dateSent: formatDate(t.createdAt),
            status: s.label,
            statusKey: s.key,
          };
        });

        setComplaints(mapped);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading complaints:', err);
        setError('Không thể tải danh sách khiếu nại. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyComplaints();
  }, []);

  const getStatusClass = (statusKey) => {
    const statusMap = {
      processing: 'statusProcessing',
      completed: 'statusCompleted',
      rejected: 'statusRejected',
    };
    return statusMap[statusKey] || '';
  };

  const handleCreateComplaint = () => {
    navigate('/support?section=quality');
  };

  const handleViewDetails = (complaintId) => {
    // Tạm thời điều hướng sang trang hỗ trợ để xem/trao đổi thêm
    navigate('/support?section=quality');
  };

  return (
    <div className={cx('card', 'complaintsCard')}>
      <div className={cx('complaintsHeader')}>
        <h2>Đơn khiếu nại</h2>
        <button
          type="button"
          className={cx('btn', 'btnPrimary', 'newComplaintBtn')}
          onClick={handleCreateComplaint}
        >
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
            {loading ? (
              <tr>
                <td colSpan="5" className={cx('emptyTableMessage')}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="5" className={cx('emptyTableMessage')}>
                  {error}
                </td>
              </tr>
            ) : complaints.length === 0 ? (
              <tr>
                <td colSpan="5" className={cx('emptyTableMessage')}>
                  Bạn chưa có đơn khiếu nại nào.
                </td>
              </tr>
            ) : (
              complaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td className={cx('complaintId')}>#{complaint.id}</td>
                  <td className={cx('complaintOrder')}>
                    {complaint.orderCode === 'OTHER' ? '-' : `#${complaint.orderCode}`}
                  </td>
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
