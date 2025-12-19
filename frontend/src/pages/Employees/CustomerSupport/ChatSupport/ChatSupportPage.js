import { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './ChatSupportPage.module.scss';
import ticketService from '~/services/ticket';

const cx = classNames.bind(styles);

const STATUS_CONFIG = {
    NEW: { label: 'Mới', color: '#3b82f6' },
    PENDING: { label: 'Chờ xử lý', color: '#f59e0b' },
    IN_PROGRESS: { label: 'Đang xử lý', color: '#8b5cf6' },
    RESOLVED: { label: 'Đã xử lý', color: '#10b981' },
    CLOSED: { label: 'Đã đóng', color: '#6b7280' },
};

function ChatSupportPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await ticketService.getAllTickets();
            // Filter to show only chat support tickets (topic = "Chat hỗ trợ")
            const chatTickets = Array.isArray(data)
                ? data.filter(t => t.topic === 'Chat hỗ trợ')
                : [];
            setTickets(chatTickets);
        } catch (err) {
            console.error('Error fetching chat tickets:', err);
            setError('Không thể tải danh sách tin nhắn');
        } finally {
            setLoading(false);
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        if (filterStatus === 'ALL') return true;
        return ticket.status === filterStatus;
    });

    const handleTicketClick = (ticket) => {
        setSelectedTicket(ticket);
        setReplyText('');
    };

    const handleCloseDetail = () => {
        setSelectedTicket(null);
        setReplyText('');
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedTicket) return;

        setSubmitting(true);
        try {
            // Update ticket with reply and status
            await ticketService.updateTicket(selectedTicket.id, {
                reply: replyText.trim(),
                status: 'IN_PROGRESS',
            });

            // Refresh tickets
            await fetchTickets();

            // Update selected ticket
            setSelectedTicket({
                ...selectedTicket,
                reply: replyText.trim(),
                status: 'IN_PROGRESS',
            });

            setReplyText('');
            alert('Đã gửi phản hồi thành công!');
        } catch (err) {
            console.error('Error sending reply:', err);
            alert('Có lỗi xảy ra khi gửi phản hồi');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolveTicket = async () => {
        if (!selectedTicket) return;

        setSubmitting(true);
        try {
            await ticketService.updateTicket(selectedTicket.id, {
                status: 'RESOLVED',
            });

            await fetchTickets();
            setSelectedTicket({
                ...selectedTicket,
                status: 'RESOLVED',
            });

            alert('Đã đánh dấu đã xử lý!');
        } catch (err) {
            console.error('Error resolving ticket:', err);
            alert('Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return <div className={cx('loading')}>Đang tải...</div>;
    }

    if (error) {
        return <div className={cx('error')}>{error}</div>;
    }

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h1 className={cx('title')}>Hỗ trợ Chat</h1>
                <p className={cx('subtitle')}>
                    Quản lý tin nhắn từ khách hàng qua ChatButton
                </p>
            </div>

            <div className={cx('filters')}>
                {['ALL', 'NEW', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map((status) => (
                    <button
                        key={status}
                        type="button"
                        className={cx('filterBtn', { active: filterStatus === status })}
                        onClick={() => setFilterStatus(status)}
                    >
                        {status === 'ALL' ? 'Tất cả' : STATUS_CONFIG[status]?.label}
                        {status === 'ALL' && ` (${tickets.length})`}
                        {status !== 'ALL' && ` (${tickets.filter(t => t.status === status).length})`}
                    </button>
                ))}
            </div>

            <div className={cx('content')}>
                <div className={cx('ticketList')}>
                    {filteredTickets.length === 0 ? (
                        <div className={cx('empty')}>Không có tin nhắn nào</div>
                    ) : (
                        filteredTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                className={cx('ticketCard', { selected: selectedTicket?.id === ticket.id })}
                                onClick={() => handleTicketClick(ticket)}
                            >
                                <div className={cx('ticketHeader')}>
                                    <span className={cx('customerName')}>
                                        {ticket.customerName || 'Khách hàng'}
                                    </span>
                                    <span
                                        className={cx('statusBadge')}
                                        style={{ backgroundColor: STATUS_CONFIG[ticket.status]?.color }}
                                    >
                                        {STATUS_CONFIG[ticket.status]?.label || ticket.status}
                                    </span>
                                </div>
                                <p className={cx('ticketContent')}>
                                    {ticket.content?.substring(0, 100)}
                                    {ticket.content?.length > 100 ? '...' : ''}
                                </p>
                                <div className={cx('ticketFooter')}>
                                    <span className={cx('ticketDate')}>
                                        {formatDate(ticket.createdAt)}
                                    </span>
                                    {ticket.email && (
                                        <span className={cx('ticketEmail')}>{ticket.email}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {selectedTicket && (
                    <div className={cx('ticketDetail')}>
                        <div className={cx('detailHeader')}>
                            <h2 className={cx('detailTitle')}>Chi tiết tin nhắn</h2>
                            <button
                                type="button"
                                className={cx('closeBtn')}
                                onClick={handleCloseDetail}
                            >
                                ✕
                            </button>
                        </div>

                        <div className={cx('detailBody')}>
                            <div className={cx('detailSection')}>
                                <label>Khách hàng:</label>
                                <p>{selectedTicket.customerName || 'N/A'}</p>
                            </div>

                            <div className={cx('detailSection')}>
                                <label>Email:</label>
                                <p>{selectedTicket.email || 'N/A'}</p>
                            </div>

                            <div className={cx('detailSection')}>
                                <label>Số điện thoại:</label>
                                <p>{selectedTicket.phone || 'N/A'}</p>
                            </div>

                            <div className={cx('detailSection')}>
                                <label>Trạng thái:</label>
                                <span
                                    className={cx('statusBadge')}
                                    style={{ backgroundColor: STATUS_CONFIG[selectedTicket.status]?.color }}
                                >
                                    {STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
                                </span>
                            </div>

                            <div className={cx('detailSection')}>
                                <label>Nội dung tin nhắn:</label>
                                <div className={cx('messageBox', 'customer')}>
                                    {selectedTicket.content || 'Không có nội dung'}
                                </div>
                            </div>

                            {selectedTicket.reply && (
                                <div className={cx('detailSection')}>
                                    <label>Phản hồi của bạn:</label>
                                    <div className={cx('messageBox', 'support')}>
                                        {selectedTicket.reply}
                                    </div>
                                </div>
                            )}

                            {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                                <div className={cx('detailSection')}>
                                    <label>Gửi phản hồi:</label>
                                    <textarea
                                        className={cx('replyInput')}
                                        rows={4}
                                        placeholder="Nhập phản hồi của bạn..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        disabled={submitting}
                                    />
                                    <div className={cx('actionButtons')}>
                                        <button
                                            type="button"
                                            className={cx('btn', 'btnPrimary')}
                                            onClick={handleSendReply}
                                            disabled={!replyText.trim() || submitting}
                                        >
                                            {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
                                        </button>
                                        <button
                                            type="button"
                                            className={cx('btn', 'btnSuccess')}
                                            onClick={handleResolveTicket}
                                            disabled={submitting}
                                        >
                                            Đánh dấu đã xử lý
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={cx('detailSection')}>
                                <label>Thời gian tạo:</label>
                                <p>{formatDate(selectedTicket.createdAt)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatSupportPage;
