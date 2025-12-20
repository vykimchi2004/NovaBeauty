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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
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

  const handleViewDetails = async (complaintId) => {
    try {
      setDetailLoading(true);
      const ticket = await ticketService.getTicketById(complaintId);
      
      const mapStatus = (raw) => {
        const key = (raw || '').toUpperCase();
        if (key === 'RESOLVED') return { label: 'Hoàn tất', key: 'completed' };
        if (key === 'PENDING' || key === 'IN_PROGRESS' || key === 'ESCALATED') {
          return { label: 'Đang xử lý', key: 'processing' };
        }
        return { label: raw || 'Không xác định', key: 'processing' };
      };

      const formatDateTime = (value) => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      };

      const status = mapStatus(ticket.status);
      const displayOrderCode = ticket.orderCode === 'KHAC' || ticket.orderCode === 'OTHER' ? '-' : (ticket.orderCode || '-');
      
      setSelectedComplaint({
        id: ticket.id || '',
        orderCode: displayOrderCode,
        topic: ticket.topic || '',
        customer: ticket.customerName || '',
        email: ticket.email || '',
        phone: ticket.phone || '',
        date: formatDateTime(ticket.createdAt),
        status: status.label,
        statusKey: status.key,
        content: ticket.content || '',
        csNote: ticket.csNote || '',
        adminNote: ticket.adminNote || '',
        handlerName: ticket.handlerName || '',
        assignedTo: ticket.assignedTo || '',
      });
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error loading complaint details:', err);
      setError('Không thể tải chi tiết khiếu nại. Vui lòng thử lại sau.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedComplaint(null);
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
                      disabled={detailLoading}
                    >
                      {detailLoading ? 'Đang tải...' : 'Xem chi tiết'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal chi tiết khiếu nại */}
      {showDetailModal && selectedComplaint && (
        <div className={cx('complaintModalOverlay')} onClick={handleCloseModal}>
          <div className={cx('complaintModalContent')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('complaintModalHeader')}>
              <h2 className={cx('complaintModalTitle')}>Chi tiết khiếu nại</h2>
              <button className={cx('complaintModalCloseBtn')} onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className={cx('complaintModalBody')}>
              <div className={cx('complaintDetailSection')}>
                <div className={cx('complaintDetailRow')}>
                  <span className={cx('complaintDetailLabel')}>Mã khiếu nại:</span>
                  <span className={cx('complaintDetailValue')}>#{selectedComplaint.id}</span>
                </div>
                <div className={cx('complaintDetailRow')}>
                  <span className={cx('complaintDetailLabel')}>Mã đơn hàng:</span>
                  <span className={cx('complaintDetailValue')}>
                    {selectedComplaint.orderCode === '-' ? '-' : `#${selectedComplaint.orderCode}`}
                  </span>
                </div>
                {selectedComplaint.topic && (
                  <div className={cx('complaintDetailRow')}>
                    <span className={cx('complaintDetailLabel')}>Chủ đề:</span>
                    <span className={cx('complaintDetailValue')}>{selectedComplaint.topic}</span>
                  </div>
                )}
                <div className={cx('complaintDetailRow')}>
                  <span className={cx('complaintDetailLabel')}>Tên:</span>
                  <span className={cx('complaintDetailValue')}>{selectedComplaint.customer || '-'}</span>
                </div>
                <div className={cx('complaintDetailRow')}>
                  <span className={cx('complaintDetailLabel')}>Email:</span>
                  <span className={cx('complaintDetailValue')}>{selectedComplaint.email || '-'}</span>
                </div>
                <div className={cx('complaintDetailRow')}>
                  <span className={cx('complaintDetailLabel')}>SĐT:</span>
                  <span className={cx('complaintDetailValue')}>{selectedComplaint.phone || '-'}</span>
                </div>
                <div className={cx('complaintDetailRow')}>
                  <span className={cx('complaintDetailLabel')}>Ngày gửi:</span>
                  <span className={cx('complaintDetailValue')}>{selectedComplaint.date}</span>
                </div>
                <div className={cx('complaintDetailRow')}>
                  <span className={cx('complaintDetailLabel')}>Trạng thái:</span>
                  <span className={cx('complaintStatus', getStatusClass(selectedComplaint.statusKey))}>
                    {selectedComplaint.status}
                  </span>
                </div>
                <div className={cx('complaintDetailRow', 'complaintContentRow')}>
                  <span className={cx('complaintDetailLabel')}>Nội dung:</span>
                  <div className={cx('complaintContent')}>{selectedComplaint.content || '-'}</div>
                </div>
                {selectedComplaint.csNote && (
                  <div className={cx('complaintDetailRow', 'complaintNoteRow')}>
                    <span className={cx('complaintDetailLabel')}>Ghi chú CSKH:</span>
                    <div className={cx('complaintNote', 'complaintCsNote')}>{selectedComplaint.csNote}</div>
                  </div>
                )}
                {selectedComplaint.adminNote && (
                  <div className={cx('complaintDetailRow', 'complaintNoteRow')}>
                    <span className={cx('complaintDetailLabel')}>Ghi chú Admin:</span>
                    <div className={cx('complaintNote', 'complaintAdminNote')}>{selectedComplaint.adminNote}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplaintSection;
