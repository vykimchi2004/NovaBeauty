import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faEye,
  faCheck,
  faTimes,
  faArrowUp,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageComplaints.module.scss';
import ticketService from '~/services/ticket';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

function ManageComplaints() {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [searchTerm, filterStatus, tickets]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await ticketService.getAllTickets();
      setTickets(data || []);
      setFilteredTickets(data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      notify.error('Không thể tải danh sách khiếu nại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.orderCode?.toLowerCase().includes(term) ||
        ticket.customerName?.toLowerCase().includes(term) ||
        ticket.email?.toLowerCase().includes(term) ||
        ticket.phone?.toLowerCase().includes(term) ||
        ticket.id?.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(ticket => {
        const status = ticket.status?.toLowerCase() || '';
        return status === filterStatus.toLowerCase();
      });
    }

    setFilteredTickets(filtered);
  };

  const handleViewDetail = async (ticketId) => {
    try {
      const ticket = await ticketService.getTicketById(ticketId);
      setSelectedTicket(ticket);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error fetching ticket detail:', err);
      notify.error('Không thể tải chi tiết khiếu nại. Vui lòng thử lại.');
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;

    try {
      await ticketService.resolveTicket(selectedTicket.id, resolveNote);
      notify.success('Đã giải quyết khiếu nại thành công!');
      setShowDetailModal(false);
      setResolveNote('');
      fetchTickets();
    } catch (err) {
      console.error('Error resolving ticket:', err);
      notify.error('Không thể giải quyết khiếu nại. Vui lòng thử lại.');
    }
  };

  const handleEscalate = async (ticketId) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc muốn nâng cấp khiếu nại này?',
      'Xác nhận nâng cấp khiếu nại',
      'Nâng cấp',
      'Hủy'
    );
    
    if (!confirmed) return;

    try {
      await ticketService.escalateTicket(ticketId);
      notify.success('Đã nâng cấp khiếu nại thành công!');
      fetchTickets();
    } catch (err) {
      console.error('Error escalating ticket:', err);
      notify.error('Không thể nâng cấp khiếu nại. Vui lòng thử lại.');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { label: 'Chờ xử lý', class: 'pending' },
      IN_PROGRESS: { label: 'Đang xử lý', class: 'progress' },
      RESOLVED: { label: 'Đã giải quyết', class: 'resolved' },
      ESCALATED: { label: 'Đã nâng cấp', class: 'escalated' }
    };
    const statusInfo = statusMap[status] || { label: status, class: 'default' };
    return <span className={cx('statusBadge', statusInfo.class)}>{statusInfo.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={cx('wrapper')}>
        <div className={cx('loading')}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className={cx('wrapper')}>
      <div className={cx('header')}>
        <h2 className={cx('title')}>Quản lý khiếu nại</h2>
        <div className={cx('headerActions')}>
          <div className={cx('searchBox')}>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã đơn, tên khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cx('searchInput')}
            />
            <button type="button" className={cx('searchBtn')}>
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </div>
          <div className={cx('sortGroup')}>
            <span className={cx('sortLabel')}>Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={cx('sortSelect')}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ xử lý</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="resolved">Đã giải quyết</option>
              <option value="escalated">Đã nâng cấp</option>
            </select>
          </div>
        </div>
      </div>

      <div className={cx('tableWrapper')}>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Mã đơn hàng</th>
              <th>Khách hàng</th>
              <th>Email</th>
              <th>Ngày tạo</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan="7" className={cx('empty')}>
                  Không có khiếu nại nào
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className={cx('idCell')}>{ticket.id.substring(0, 8)}...</td>
                  <td>{ticket.orderCode || '-'}</td>
                  <td className={cx('nameCell')}>{ticket.customerName || '-'}</td>
                  <td>{ticket.email || '-'}</td>
                  <td>{formatDate(ticket.createdAt)}</td>
                  <td>{getStatusBadge(ticket.status)}</td>
                  <td>
                    <div className={cx('actions')}>
                      <button
                        type="button"
                        className={cx('actionBtn', 'viewBtn')}
                        onClick={() => handleViewDetail(ticket.id)}
                        title="Xem chi tiết"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      {ticket.status !== 'RESOLVED' && ticket.status !== 'ESCALATED' && (
                        <button
                          type="button"
                          className={cx('actionBtn', 'escalateBtn')}
                          onClick={() => handleEscalate(ticket.id)}
                          title="Nâng cấp"
                        >
                          <FontAwesomeIcon icon={faArrowUp} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTicket && (
        <div className={cx('modalOverlay')} onClick={() => setShowDetailModal(false)}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>Chi tiết khiếu nại</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowDetailModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className={cx('modalContent')}>
              <div className={cx('detailSection')}>
                <h4>Thông tin khiếu nại</h4>
                <div className={cx('detailGrid')}>
                  <div className={cx('detailItem')}>
                    <label>ID:</label>
                    <span>{selectedTicket.id}</span>
                  </div>
                  <div className={cx('detailItem')}>
                    <label>Mã đơn hàng:</label>
                    <span>{selectedTicket.orderCode || '-'}</span>
                  </div>
                  <div className={cx('detailItem')}>
                    <label>Khách hàng:</label>
                    <span>{selectedTicket.customerName || '-'}</span>
                  </div>
                  <div className={cx('detailItem')}>
                    <label>Email:</label>
                    <span>{selectedTicket.email || '-'}</span>
                  </div>
                  <div className={cx('detailItem')}>
                    <label>SĐT:</label>
                    <span>{selectedTicket.phone || '-'}</span>
                  </div>
                  <div className={cx('detailItem')}>
                    <label>Trạng thái:</label>
                    <span>{getStatusBadge(selectedTicket.status)}</span>
                  </div>
                  <div className={cx('detailItem', 'fullWidth')}>
                    <label>Nội dung khiếu nại:</label>
                    <div className={cx('contentBox')}>{selectedTicket.content || '-'}</div>
                  </div>
                  {selectedTicket.handlerNote && (
                    <div className={cx('detailItem', 'fullWidth')}>
                      <label>Ghi chú xử lý:</label>
                      <div className={cx('contentBox')}>{selectedTicket.handlerNote}</div>
                    </div>
                  )}
                </div>
              </div>

              {selectedTicket.status !== 'RESOLVED' && (
                <div className={cx('resolveSection')}>
                  <h4>Giải quyết khiếu nại</h4>
                  <div className={cx('formGroup')}>
                    <label>Ghi chú giải quyết:</label>
                    <textarea
                      rows="4"
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      placeholder="Nhập ghi chú về cách giải quyết khiếu nại..."
                      className={cx('resolveTextarea')}
                    />
                  </div>
                  <button type="button" className={cx('resolveBtn')} onClick={handleResolve}>
                    <FontAwesomeIcon icon={faCheck} />
                    Giải quyết
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageComplaints;
