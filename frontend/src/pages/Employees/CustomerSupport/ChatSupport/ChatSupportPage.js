import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './ChatSupportPage.module.scss';
import chatService from '~/services/chat';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';

const cx = classNames.bind(styles);

function ChatSupportPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [conversationsWithPendingRequest, setConversationsWithPendingRequest] = useState(new Set());
    const [conversationAcceptedBy, setConversationAcceptedBy] = useState(new Map()); // Map<partnerId, {userId, userName}>
    const [conversationsDisconnected, setConversationsDisconnected] = useState(new Set()); // Set<partnerId> - conversations đã bị ngắt kết nối

    // Reload khi component mount hoặc khi quay lại trang này
    useEffect(() => {
        // Reset state
        setLoading(true);
        setError(null);
        
        // Fetch conversations mới
        fetchConversations();
    }, [location.pathname]); // Reload khi pathname thay đổi (quay lại trang)

    // Auto refresh conversations mỗi 5 giây
    useEffect(() => {
        const interval = setInterval(() => {
            fetchConversations();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchConversations = async () => {
        try {
            const data = await chatService.getConversations();
            setConversations(data || []);
            
            // Kiểm tra tất cả conversations để tìm welcome messages chưa được phản hồi và ai đã tiếp nhận
            if (data && data.length > 0) {
                const pendingSet = new Set();
                const acceptedMap = new Map();
                const disconnectedSet = new Set();
                
                // Fetch messages cho tất cả conversations để kiểm tra
                const checkPromises = data.map(async (conv) => {
                    try {
                        const messages = await chatService.getConversation(conv.partnerId);
                        if (messages && messages.length > 0) {
                            // Tìm tất cả welcome messages (có thể có nhiều nếu khách hàng kết nối lại)
                            const allWelcomeMessages = messages.filter(msg => 
                                msg.message && 
                                msg.message.includes('Khách hàng yêu cầu chat trực tiếp với nhân viên hỗ trợ từ chatbot') &&
                                msg.senderId !== currentUserId
                            );
                            
                            if (allWelcomeMessages.length > 0) {
                                // Tìm welcome message mới nhất
                                const latestWelcomeMessage = allWelcomeMessages[allWelcomeMessages.length - 1];
                                const welcomeIndex = messages.findIndex(msg => msg.id === latestWelcomeMessage.id);
                                
                                // Tìm tin nhắn "Tôi đã tiếp nhận" sau welcome message mới nhất
                                const acceptMessage = messages.slice(welcomeIndex + 1).find(msg => 
                                    msg.message && 
                                    msg.message.includes('Tôi đã tiếp nhận yêu cầu hỗ trợ của bạn') &&
                                    msg.senderId !== conv.partnerId // Phải là từ CSKH
                                );
                                
                                if (acceptMessage) {
                                    const acceptIndex = messages.findIndex(msg => msg.id === acceptMessage.id);
                                    
                                    // Kiểm tra xem có tin nhắn disconnect sau tin nhắn accept không
                                    const disconnectMessage = messages.slice(acceptIndex + 1).find(msg => 
                                        msg.message && 
                                        msg.message.includes('[SYSTEM_DISCONNECT]') &&
                                        msg.senderId === conv.partnerId // Phải là từ khách hàng
                                    );
                                    
                                    if (disconnectMessage) {
                                        // Kiểm tra xem có welcome message mới sau disconnect không (khách hàng kết nối lại)
                                        const disconnectIndex = messages.findIndex(msg => msg.id === disconnectMessage.id);
                                        const newWelcomeAfterDisconnect = messages.slice(disconnectIndex + 1).find(msg => 
                                            msg.message && 
                                            msg.message.includes('Khách hàng yêu cầu chat trực tiếp với nhân viên hỗ trợ từ chatbot') &&
                                            msg.senderId !== currentUserId
                                        );
                                        
                                        if (newWelcomeAfterDisconnect) {
                                            // Khách hàng đã kết nối lại, quay về trạng thái chờ tiếp nhận
                                            pendingSet.add(conv.partnerId);
                                            disconnectedSet.delete(conv.partnerId);
                                            // Xóa khỏi acceptedMap vì đây là request mới
                                            acceptedMap.delete(conv.partnerId);
                                        } else {
                                            // Đã bị ngắt kết nối nhưng chưa kết nối lại
                                            disconnectedSet.add(conv.partnerId);
                                            // KHÔNG thêm vào pendingSet vì đã disconnect
                                            // Xóa khỏi acceptedMap
                                            acceptedMap.delete(conv.partnerId);
                                        }
                                    } else {
                                        disconnectedSet.delete(conv.partnerId);
                                        // Đã có người tiếp nhận và chưa bị ngắt kết nối
                                        acceptedMap.set(conv.partnerId, {
                                            userId: acceptMessage.senderId,
                                            userName: acceptMessage.senderName || 'CSKH'
                                        });
                                    }
                                } else {
                                    // Chưa có người tiếp nhận
                                    // Kiểm tra xem có bị disconnect không (disconnect trước khi có accept)
                                    const disconnectBeforeAccept = messages.find(msg => 
                                        msg.message && 
                                        msg.message.includes('[SYSTEM_DISCONNECT]') &&
                                        msg.senderId === conv.partnerId
                                    );
                                    
                                    if (disconnectBeforeAccept) {
                                        // Có disconnect message, kiểm tra xem có welcome message mới sau disconnect không
                                        const disconnectIndex = messages.findIndex(msg => msg.id === disconnectBeforeAccept.id);
                                        const newWelcomeAfterDisconnect = messages.slice(disconnectIndex + 1).find(msg => 
                                            msg.message && 
                                            msg.message.includes('Khách hàng yêu cầu chat trực tiếp với nhân viên hỗ trợ từ chatbot') &&
                                            msg.senderId !== currentUserId
                                        );
                                        
                                        if (!newWelcomeAfterDisconnect) {
                                            // Đã disconnect và chưa kết nối lại
                                            disconnectedSet.add(conv.partnerId);
                                            // KHÔNG thêm vào pendingSet
                                        } else {
                                            // Đã kết nối lại, có pending request mới
                                            pendingSet.add(conv.partnerId);
                                            disconnectedSet.delete(conv.partnerId);
                                        }
                                    } else {
                                        // Không có disconnect, có pending request
                                        pendingSet.add(conv.partnerId);
                                        disconnectedSet.delete(conv.partnerId);
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.warn(`Error checking messages for ${conv.partnerId}:`, err);
                    }
                });
                
                await Promise.all(checkPromises);
                setConversationsWithPendingRequest(pendingSet);
                setConversationAcceptedBy(acceptedMap);
                setConversationsDisconnected(disconnectedSet);
            }
            
            // Không tự động chọn conversation đầu tiên - để người dùng tự chọn
            setError(null);
        } catch (err) {
            console.error('Error fetching conversations:', err);
            setError('Không thể tải danh sách cuộc trò chuyện');
        } finally {
            setLoading(false);
        }
    };



    const handleConversationClick = (conv) => {
        const acceptedInfo = conversationAcceptedBy.get(conv.partnerId);
        const isAcceptedByMe = acceptedInfo && acceptedInfo.userId === currentUserId;
        const isAcceptedByOther = acceptedInfo && acceptedInfo.userId !== currentUserId;
        
        // Nếu đã được tiếp nhận (bởi CSKH hiện tại hoặc CSKH khác), chuyển sang trang detail
        if (isAcceptedByMe || isAcceptedByOther) {
            navigate(`/customer-support/chat-support/${conv.partnerId}`);
        }
    };

    const handleAcceptRequest = async (partnerId, e) => {
        e?.stopPropagation();
        if (!partnerId || sending) return;

        // Kiểm tra xem đã có người khác tiếp nhận chưa
        const acceptedInfo = conversationAcceptedBy.get(partnerId);
        if (acceptedInfo && acceptedInfo.userId !== currentUserId) {
            alert(`Yêu cầu này đã được tiếp nhận bởi ${acceptedInfo.userName}`);
            return;
        }

        setSending(true);
        try {
            const acceptMessage = 'Tôi đã tiếp nhận yêu cầu hỗ trợ của bạn. Vui lòng mô tả chi tiết vấn đề bạn cần hỗ trợ.';
            await chatService.sendMessage(partnerId, acceptMessage);
            
            // Cập nhật ngay lập tức để tránh race condition
            const currentUser = storage.get(STORAGE_KEYS.USER);
            setConversationAcceptedBy(prev => {
                const newMap = new Map(prev);
                newMap.set(partnerId, {
                    userId: currentUserId,
                    userName: currentUser?.fullName || currentUser?.name || 'CSKH'
                });
                return newMap;
            });
            
            // Refresh conversations
            await fetchConversations();
            
            // Chuyển sang trang chat detail sau khi tiếp nhận
            navigate(`/customer-support/chat-support/${partnerId}`);
        } catch (err) {
            console.error('Error accepting request:', err);
            alert('Có lỗi xảy ra khi gửi tin nhắn');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
        
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Lấy current user ID từ storage (CSKH)
    const getCurrentUserId = () => {
        try {
            const user = storage.get(STORAGE_KEYS.USER);
            return user?.id;
        } catch {
            return null;
        }
    };

    const currentUserId = getCurrentUserId();

    if (loading) {
        return <div className={cx('loading')}>Đang tải...</div>;
    }

    if (error && conversations.length === 0) {
        return <div className={cx('error')}>{error}</div>;
    }

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h1 className={cx('title')}>Hỗ trợ Chat</h1>
                <p className={cx('subtitle')}>
                    Quản lý tin nhắn từ khách hàng.
                </p>
            </div>

            <div className={cx('content-wrapper')}>
                <div className={cx('card')}>
                    <div className={cx('card-header')}>
                        <h3 className={cx('card-title')}>Danh sách cuộc trò chuyện</h3>
                        <p className={cx('card-desc')}>
                            {conversationsWithPendingRequest.size > 0 && (
                                <>Có {conversationsWithPendingRequest.size} yêu cầu chờ tiếp nhận. </>
                            )}
                            Tổng cộng: {conversations.length} cuộc trò chuyện
                        </p>
            </div>

                    <div className={cx('table-container')}>
                        {conversations.length === 0 ? (
                            <div className={cx('empty')}>Chưa có cuộc trò chuyện nào</div>
                        ) : (
                            <table className={cx('conversation-table')}>
                                <thead>
                                    <tr>
                                        <th>Khách hàng</th>
                                        <th>Email</th>
                                        <th>Tin nhắn cuối</th>
                                        <th>Thời gian</th>
                                        <th>Trạng thái</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conversations.map((conv) => {
                                        const hasPendingRequest = conversationsWithPendingRequest.has(conv.partnerId);
                                        const acceptedInfo = conversationAcceptedBy.get(conv.partnerId);
                                        const isAcceptedByMe = acceptedInfo && acceptedInfo.userId === currentUserId;
                                        const isAcceptedByOther = acceptedInfo && acceptedInfo.userId !== currentUserId;
                                        
                                        return (
                                            <tr
                                    key={conv.partnerId}
                                                className={cx({
                                        unread: conv.unreadCount > 0,
                                                    clickable: acceptedInfo && (isAcceptedByMe || isAcceptedByOther),
                                    })}
                                    onClick={() => handleConversationClick(conv)}
                                                style={{ cursor: acceptedInfo && (isAcceptedByMe || isAcceptedByOther) ? 'pointer' : 'default' }}
                                            >
                                                <td>
                                                    <span className={cx('customerName')}>
                                                {conv.partnerName || 'Khách hàng'}
                                            {conv.unreadCount > 0 && (
                                                            <span className={cx('unreadBadge', 'table')}>
                                                    {conv.unreadCount}
                                    </span>
                                            )}
                                                    </span>
                                                </td>
                                                <td>{conv.partnerEmail || '-'}</td>
                                                <td>
                                                    <span className={cx('lastMessage', 'table')}>
                                                {conv.lastMessage || 'Chưa có tin nhắn'}
                                            </span>
                                                </td>
                                                <td>
                                                    {conv.lastMessageTime ? formatTime(conv.lastMessageTime) : '-'}
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const isDisconnected = conversationsDisconnected.has(conv.partnerId);
                                                        
                                                        if (isDisconnected) {
                                                            return (
                                                                <span className={cx('status', 'status-escalated')}>
                                                                    Đã ngắt kết nối
                                    </span>
                                                            );
                                                        }
                                                        
                                                        if (hasPendingRequest && !acceptedInfo) {
                                                            return (
                                                                <span className={cx('status', 'status-pending')}>
                                                                    Chờ tiếp nhận
                                                                </span>
                                                            );
                                                        }
                                                        
                                                        if (isAcceptedByMe) {
                                                            return (
                                                                <span className={cx('status', 'status-in_progress')}>
                                                                    Bạn đã tiếp nhận
                                                                </span>
                                                            );
                                                        }
                                                        
                                                        if (isAcceptedByOther) {
                                        return (
                                                                <span className={cx('status', 'status-resolved')}>
                                                                    Đã tiếp nhận
                                                                </span>
                                                            );
                                                        }
                                                        
                                                        if (!hasPendingRequest && !acceptedInfo) {
                                                            return (
                                                                <span className={cx('status', 'status-new')}>
                                                                    Mới
                                                                </span>
                                                            );
                                                        }
                                                        
                                                        return null;
                                                    })()}
                                                </td>
                                                <td>
                                                    {hasPendingRequest && !acceptedInfo && !conversationsDisconnected.has(conv.partnerId) && (
                                                        <button
                                                            className={cx('view-btn')}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAcceptRequest(conv.partnerId, e);
                                    }}
                                    disabled={sending}
                                                        >
                                                            {sending ? 'Đang gửi...' : 'Tiếp nhận'}
                                </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                                    )}
                                        </div>
                    </div>
            </div>
        </div>
    );
}

export default ChatSupportPage;
