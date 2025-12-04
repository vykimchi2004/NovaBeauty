import { useState, useEffect, useMemo } from 'react';
import classNames from 'classnames/bind';
import { useNavigate } from 'react-router-dom';
import styles from './ComplaintManagementPage.module.scss';
import ticketService from '~/services/ticket';
import { useNotification } from '../../../components/Common/Notification';
import ConfirmDialog from '../../../components/Common/ConfirmDialog/DeleteAccountDialog';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';

const cx = classNames.bind(styles);

// Map status from backend to display
const statusMap = {
    NEW: 'Mới',
    PENDING: 'Chờ xử lý',
    IN_PROGRESS: 'Đang xử lý',
    RESOLVED: 'Đã giải quyết',
    ESCALATED: 'Chuyển Admin',
};

// Map assignee from backend to display
const assigneeMap = {
    CS: 'CSKH',
    ADMIN: 'Admin',
};

const initialConfirmState = {
    open: false,
    title: '',
    message: '',
    onConfirm: null,
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

export default function ComplaintManagementPage() {
    const navigate = useNavigate();
    const { success: notifySuccess, error: notifyError } = useNotification();

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [note, setNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(initialConfirmState);

    // Lấy user hiện tại từ localStorage (NovaBeauty đang lưu user ở STORAGE_KEYS.USER)
    useEffect(() => {
        const user = storage.get(STORAGE_KEYS.USER, null);
        if (user?.id) {
            setCurrentUserId(user.id);
        }
    }, []);

    // Fetch complaints from API qua ticketService
    useEffect(() => {
        const fetchComplaints = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await ticketService.getAllTickets();

                // Map backend data to display format giống LuminaBook
                const mappedComplaints = (data || []).map((ticket) => ({
                    id: ticket.id,
                    orderCode: ticket.orderCode === 'KHAC' ? '-' : ticket.orderCode,
                    customer: ticket.customerName,
                    phone: ticket.phone,
                    email: ticket.email,
                    topic: ticket.topic || '',
                    status: statusMap[ticket.status] || ticket.status,
                    statusRaw: ticket.status,
                    authority: assigneeMap[ticket.assignedTo] || ticket.assignedTo,
                    assignedToRaw: ticket.assignedTo,
                    handlerId: ticket.handlerId || '',
                    handlerName: ticket.handlerName || '',
                    date: ticket.createdAt ? formatDateTime(ticket.createdAt) : '',
                    createdAt: ticket.createdAt,
                    content: ticket.content,
                    handlerNote: ticket.handlerNote || '',
                }));

                setComplaints(mappedComplaints);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Error fetching complaints:', err);
                setError(err.message || 'Đã xảy ra lỗi khi tải danh sách khiếu nại');
            } finally {
                setLoading(false);
            }
        };

        fetchComplaints();
    }, []);

    const handleView = (complaint) => {
        setSelectedComplaint(complaint);
        setNote(complaint.handlerNote || '');
        setActionError('');
        setActionSuccess('');
    };

    const refreshComplaints = async () => {
        try {
            const data = await ticketService.getAllTickets();
            const mappedComplaints = (data || []).map((ticket) => ({
                id: ticket.id,
                orderCode: ticket.orderCode === 'KHAC' ? '-' : ticket.orderCode,
                customer: ticket.customerName,
                phone: ticket.phone,
                email: ticket.email,
                topic: ticket.topic || '',
                status: statusMap[ticket.status] || ticket.status,
                statusRaw: ticket.status,
                authority: assigneeMap[ticket.assignedTo] || ticket.assignedTo,
                assignedToRaw: ticket.assignedTo,
                handlerId: ticket.handlerId || '',
                handlerName: ticket.handlerName || '',
                date: ticket.createdAt ? formatDateTime(ticket.createdAt) : '',
                createdAt: ticket.createdAt,
                content: ticket.content,
                handlerNote: ticket.handlerNote || '',
            }));

            setComplaints(mappedComplaints);

            if (selectedComplaint) {
                const updated = mappedComplaints.find((c) => c.id === selectedComplaint.id);
                if (updated) {
                    setSelectedComplaint(updated);
                    setNote(updated.handlerNote || '');
                }
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error refreshing complaints:', err);
        }
    };

    const handleResolved = () => {
        if (!selectedComplaint) return;

        setConfirmDialog({
            open: true,
            title: 'Xác nhận giải quyết khiếu nại',
            message: 'Bạn có chắc chắn muốn đánh dấu khiếu nại này là ĐÃ GIẢI QUYẾT không?',
            onConfirm: async () => {
                setConfirmDialog(initialConfirmState);
                setActionLoading(true);
                setActionError('');
                setActionSuccess('');

                try {
                    await ticketService.resolveTicket(selectedComplaint.id, note || '');
                    const msg = 'Khiếu nại đã được giải quyết thành công!';
                    setActionSuccess(msg);
                    notifySuccess(msg);
                    await refreshComplaints();
                    setTimeout(() => {
                        setActionSuccess('');
                    }, 3000);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Error resolving complaint:', err);
                    const msg = err.message || 'Đã xảy ra lỗi khi đánh dấu giải quyết';
                    setActionError(msg);
                    notifyError(msg);
                } finally {
                    setActionLoading(false);
                }
            },
        });
    };

    const handleAcceptComplaint = () => {
        if (!selectedComplaint) return;

        setConfirmDialog({
            open: true,
            title: 'Tiếp nhận khiếu nại',
            message: 'Bạn có chắc chắn muốn TIẾP NHẬN khiếu nại này không?',
            onConfirm: async () => {
                setConfirmDialog(initialConfirmState);
                setActionLoading(true);
                setActionError('');
                setActionSuccess('');

                try {
                    await ticketService.updateTicket(selectedComplaint.id, {
                        handlerNote: note || '',
                    });

                    const msg = 'Đã tiếp nhận khiếu nại thành công! Bạn đã trở thành người xử lý.';
                    setActionSuccess(msg);
                    notifySuccess(msg);
                    await refreshComplaints();
                    setTimeout(() => {
                        setActionSuccess('');
                    }, 3000);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Error accepting complaint:', err);
                    const msg = err.message || 'Đã xảy ra lỗi khi tiếp nhận khiếu nại';
                    setActionError(msg);
                    notifyError(msg);
                } finally {
                    setActionLoading(false);
                }
            },
        });
    };

    const handleTransferAdmin = () => {
        if (!selectedComplaint) return;

        // Không cho chuyển Admin nếu khiếu nại đã được giải quyết
        if (selectedComplaint.statusRaw === 'RESOLVED') {
            const msg = 'Khiếu nại này đã được đánh dấu ĐÃ GIẢI QUYẾT, không thể chuyển cho Admin nữa.';
            setActionError(msg);
            notifyError(msg);
            return;
        }

        setActionError('');
        setActionSuccess('');

        setConfirmDialog({
            open: true,
            title: 'Chuyển khiếu nại cho Admin',
            message:
                'Bạn có chắc chắn muốn chuyển khiếu nại này cho Admin không? Hệ thống sẽ lưu lại ghi chú của CSKH trước khi chuyển.',
            onConfirm: async () => {
                setConfirmDialog(initialConfirmState);
                setActionLoading(true);

                try {
                    // YÊU CẦU: bắt buộc nhập ghi chú trước khi chuyển Admin
                    if (!note || !note.trim()) {
                        const msg = 'Vui lòng nhập ghi chú của CSKH trước khi chuyển cho Admin.';
                        setActionError(msg);
                        notifyError(msg);
                        setActionLoading(false);
                        return;
                    }

                    // Lưu ghi chú
                    await ticketService.updateTicket(selectedComplaint.id, {
                        handlerNote: note.trim(),
                    });

                    // Gọi API escalate
                    await ticketService.escalateTicket(selectedComplaint.id);

                    const msg = 'Đã chuyển cho Admin thành công!';
                    setActionSuccess(msg);
                    notifySuccess(msg);
                    await refreshComplaints();
                    setTimeout(() => {
                        setActionSuccess('');
                    }, 3000);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Error escalating complaint:', err);
                    const msg = err.message || 'Đã xảy ra lỗi khi chuyển cho Admin';
                    setActionError(msg);
                    notifyError(msg);
                } finally {
                    setActionLoading(false);
                }
            },
        });
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('top-line')}></div>
            <div className={cx('page-header')}>
                <h1 className={cx('page-title')}>Quản lý khiếu nại</h1>
                <button className={cx('dashboard-btn')} onClick={() => navigate('/customer-support')}>
                    ← Dashboard
                </button>
            </div>

            <div className={cx('content-wrapper')}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p>Đang tải danh sách khiếu nại...</p>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className={cx('cards-container')}>
                        {/* Card trái: Danh sách khiếu nại */}
                        <div className={cx('card', 'list-card')}>
                            <div className={cx('card-header')}>
                                <h2 className={cx('card-title')}>Danh sách khiếu nại</h2>
                                <p className={cx('card-desc')}>
                                    Quản lý các đơn khiếu nại của khách hàng. Nhấp &quot;Xem&quot; để mở chi tiết xử
                                    lý.
                                </p>
                            </div>

                            <div className={cx('table-container')}>
                                {complaints.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>
                                        <p>Chưa có khiếu nại nào</p>
                                    </div>
                                ) : (
                                    <table className={cx('complaint-table')}>
                                        <thead>
                                            <tr>
                                                <th>Mã</th>
                                                <th>Khách hàng</th>
                                                <th>SĐT</th>
                                                <th>Trạng thái</th>
                                                <th>Phân quyền xử lý</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {complaints.map((complaint) => (
                                                <tr key={complaint.id}>
                                                    <td>
                                                        {complaint.orderCode === '-' 
                                                            ? '-' 
                                                            : (complaint.orderCode || complaint.id.substring(0, 8))}
                                                    </td>
                                                    <td>{complaint.customer}</td>
                                                    <td>{complaint.phone}</td>
                                                    <td>
                                                        <span
                                                            className={cx(
                                                                'status',
                                                                `status-${complaint.status
                                                                    .toLowerCase()
                                                                    .replace(/\s+/g, '-')}`,
                                                            )}
                                                        >
                                                            {complaint.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {complaint.assignedToRaw === 'ADMIN' ? (
                                                            <span className={cx('authority-tag', 'authority-transfer')}>
                                                                {complaint.authority}
                                                            </span>
                                                        ) : (
                                                            <span className={cx('authority-tag')}>
                                                                {complaint.authority}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button
                                                            className={cx('view-btn')}
                                                            onClick={() => handleView(complaint)}
                                                        >
                                                            Xem
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Card phải: Chi tiết khiếu nại */}
                        <div className={cx('card', 'detail-card')}>
                            <div className={cx('card-header')}>
                                <h2 className={cx('card-title')}>Chi tiết khiếu nại</h2>
                                <p className={cx('card-desc')}>
                                    {selectedComplaint
                                        ? 'Thông tin chi tiết về khiếu nại được chọn.'
                                        : 'Chọn một khiếu nại từ danh sách để xem chi tiết.'}
                                </p>
                            </div>

                            {selectedComplaint ? (
                                <div className={cx('detail-content')}>
                                    {actionError && (
                                        <div
                                            style={{
                                                color: 'red',
                                                marginBottom: '12px',
                                                padding: '8px',
                                                background: '#fee',
                                                borderRadius: '4px',
                                            }}
                                        >
                                            {actionError}
                                        </div>
                                    )}
                                    {actionSuccess && (
                                        <div
                                            style={{
                                                color: 'green',
                                                marginBottom: '12px',
                                                padding: '8px',
                                                background: '#efe',
                                                borderRadius: '4px',
                                            }}
                                        >
                                            {actionSuccess}
                                        </div>
                                    )}

                                    <div className={cx('detail-section')}>
                                        <div className={cx('detail-row')}>
                                            <span className={cx('detail-label')}>Mã đơn hàng:</span>
                                            <span className={cx('detail-value')}>
                                                {selectedComplaint.orderCode === '-'
                                                    ? '-'
                                                    : selectedComplaint.orderCode ||
                                                      selectedComplaint.id.substring(0, 8)}
                                            </span>
                                        </div>
                                        {selectedComplaint.topic && (
                                            <div className={cx('detail-row')}>
                                                <span className={cx('detail-label')}>Chủ đề:</span>
                                                <span className={cx('detail-value')}>{selectedComplaint.topic}</span>
                                            </div>
                                        )}
                                        <div className={cx('detail-row')}>
                                            <span className={cx('detail-label')}>Tên:</span>
                                            <span className={cx('detail-value')}>{selectedComplaint.customer}</span>
                                        </div>
                                        <div className={cx('detail-row')}>
                                            <span className={cx('detail-label')}>Email:</span>
                                            <span className={cx('detail-value')}>{selectedComplaint.email}</span>
                                        </div>
                                        <div className={cx('detail-row')}>
                                            <span className={cx('detail-label')}>SĐT:</span>
                                            <span className={cx('detail-value')}>{selectedComplaint.phone}</span>
                                        </div>
                                        <div className={cx('detail-row')}>
                                            <span className={cx('detail-label')}>Ngày:</span>
                                            <span className={cx('detail-value')}>{selectedComplaint.date}</span>
                                        </div>
                                        <div className={cx('detail-row')}>
                                            <span className={cx('detail-label')}>Nội dung:</span>
                                            <span className={cx('detail-value')}>{selectedComplaint.content}</span>
                                        </div>
                                        <div className={cx('detail-row')}>
                                            <span className={cx('detail-label')}>Người xử lý:</span>
                                            <span className={cx('detail-value')}>
                                                {selectedComplaint.handlerName
                                                    ? `CSKH - ${selectedComplaint.handlerName}`
                                                    : selectedComplaint.assignedToRaw === 'ADMIN'
                                                        ? 'Admin'
                                                        : 'Chưa có người xử lý'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={cx('notes-section')}>
                                        <label className={cx('notes-label')}>Ghi chú xử lý</label>
                                        <textarea
                                            className={cx('notes-input')}
                                            placeholder="Ghi chú ngắn"
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            rows={4}
                                            disabled={actionLoading}
                                        />
                                    </div>

                                    <div className={cx('action-buttons')}>
                                        {selectedComplaint.handlerId &&
                                            selectedComplaint.handlerId === currentUserId && (
                                                <button
                                                    className={cx('action-btn', 'btn-resolved')}
                                                    onClick={handleResolved}
                                                    disabled={
                                                        actionLoading || selectedComplaint.statusRaw === 'RESOLVED'
                                                    }
                                                >
                                                    {actionLoading ? 'Đang xử lý...' : 'Đã giải quyết'}
                                                </button>
                                            )}
                                        <button
                                            className={cx('action-btn', 'btn-save-note')}
                                            onClick={handleAcceptComplaint}
                                            disabled={
                                                actionLoading ||
                                                selectedComplaint.statusRaw === 'RESOLVED' ||
                                                // Đã có người xử lý (kể cả là chính bạn) thì không cho bấm nữa
                                                (selectedComplaint.handlerId && selectedComplaint.handlerId !== '')
                                            }
                                        >
                                            {actionLoading
                                                ? 'Đang tiếp nhận...'
                                                : selectedComplaint.statusRaw === 'RESOLVED'
                                                    ? 'Đã giải quyết'
                                                    : selectedComplaint.handlerId
                                                        ? selectedComplaint.handlerId === currentUserId
                                                            ? 'Đã tiếp nhận (Bạn)'
                                                            : 'Đã có người xử lý'
                                                        : 'Tiếp nhận khiếu nại'}
                                        </button>
                                        <button
                                            className={cx('action-btn', 'btn-transfer')}
                                            onClick={handleTransferAdmin}
                                            disabled={
                                                actionLoading ||
                                                selectedComplaint.assignedToRaw === 'ADMIN' ||
                                                selectedComplaint.statusRaw === 'RESOLVED'
                                            }
                                        >
                                            {actionLoading ? 'Đang chuyển...' : 'Chuyển cho Admin'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={cx('empty-detail')}>
                                    <p>Chưa có khiếu nại nào được chọn</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(initialConfirmState)}
                confirmText="Xác nhận"
                cancelText="Hủy"
            />
        </div>
    );
}


