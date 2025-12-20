import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPaperPlane, faCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

import styles from './ChatDetailPage.module.scss';
import chatService from '~/services/chat';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';

const cx = classNames.bind(styles);

function ChatDetailPage() {
    const { partnerId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [partnerInfo, setPartnerInfo] = useState(null);
    const [isDisconnected, setIsDisconnected] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

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

    // Fetch messages khi component mount hoặc partnerId thay đổi
    useEffect(() => {
        if (partnerId) {
            fetchMessages();
            fetchPartnerInfo();
        }
    }, [partnerId]);

    // Auto scroll to bottom khi có tin nhắn mới
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto refresh messages mỗi 3 giây
    useEffect(() => {
        if (!partnerId) return;

        const interval = setInterval(() => {
            fetchMessages();
        }, 3000);

        return () => clearInterval(interval);
    }, [partnerId]);

    const fetchPartnerInfo = async () => {
        try {
            const conversations = await chatService.getConversations();
            const conversation = conversations.find(c => c.partnerId === partnerId);
            if (conversation) {
                setPartnerInfo({
                    name: conversation.partnerName || 'Khách hàng',
                    email: conversation.partnerEmail || ''
                });
            }
        } catch (err) {
            console.error('Error fetching partner info:', err);
        }
    };

    const fetchMessages = async () => {
        if (!partnerId) return;

        try {
            const data = await chatService.getConversation(partnerId);
            setError(null);

            // Kiểm tra xem có tin nhắn disconnect không và tìm welcome message mới nhất
            if (data && data.length > 0) {
                // Tìm tất cả welcome messages ("Khách hàng yêu cầu chat trực tiếp với nhân viên hỗ trợ từ chatbot")
                const welcomeMessages = data.filter(msg =>
                    msg.message &&
                    msg.message.includes('Khách hàng yêu cầu chat trực tiếp với nhân viên hỗ trợ từ chatbot') &&
                    msg.senderId !== currentUserId
                );

                if (welcomeMessages.length > 0) {
                    // Lấy welcome message mới nhất (cuối cùng)
                    const latestWelcomeMessage = welcomeMessages[welcomeMessages.length - 1];
                    const welcomeTime = new Date(latestWelcomeMessage.createdAt);

                    // Chỉ lấy tin nhắn từ thời điểm welcome message mới nhất trở đi
                    const filteredMessages = data.filter(msg => {
                        const msgTime = new Date(msg.createdAt);
                        return msgTime >= welcomeTime;
                    });

                    setMessages(filteredMessages);

                    // Kiểm tra xem có tin nhắn disconnect sau welcome message mới nhất không
                    const welcomeIndex = data.findIndex(msg => msg.id === latestWelcomeMessage.id);
                    const disconnectMessage = data.slice(welcomeIndex + 1).find(msg =>
                        msg.message &&
                        msg.message.includes('[SYSTEM_DISCONNECT]') &&
                        msg.senderId === partnerId // Phải là từ khách hàng
                    );

                    if (disconnectMessage) {
                        // Kiểm tra xem có welcome message mới sau disconnect không (khách hàng kết nối lại)
                        const disconnectIndex = data.findIndex(msg => msg.id === disconnectMessage.id);
                        const newWelcomeAfterDisconnect = data.slice(disconnectIndex + 1).find(msg =>
                            msg.message &&
                            msg.message.includes('Khách hàng yêu cầu chat trực tiếp với nhân viên hỗ trợ từ chatbot') &&
                            msg.senderId !== currentUserId
                        );

                        if (!newWelcomeAfterDisconnect) {
                            // Khách hàng đã ngắt kết nối và chưa kết nối lại, quay về trang danh sách
                            setIsDisconnected(true);
                            navigate('/customer-support/chat-support');
                            return;
                        } else {
                            // Khách hàng đã kết nối lại - cập nhật lại filtered messages từ welcome message mới nhất
                            const newLatestWelcome = data.filter(msg =>
                                msg.message &&
                                msg.message.includes('Khách hàng yêu cầu chat trực tiếp với nhân viên hỗ trợ từ chatbot') &&
                                msg.senderId !== currentUserId
                            );

                            if (newLatestWelcome.length > 0) {
                                const newWelcomeTime = new Date(newLatestWelcome[newLatestWelcome.length - 1].createdAt);
                                const newFilteredMessages = data.filter(msg => {
                                    const msgTime = new Date(msg.createdAt);
                                    return msgTime >= newWelcomeTime;
                                });
                                setMessages(newFilteredMessages);
                            }
                            setIsDisconnected(false);
                        }
                    } else {
                        setIsDisconnected(false);
                    }
                } else {
                    // Không có welcome message, hiển thị tất cả tin nhắn (trường hợp cũ)
                    setMessages(data || []);
                }
            } else {
                setMessages([]);
            }

            // Mark as read
            try {
                await chatService.markAsRead(partnerId);
            } catch (err) {
                console.warn('Error marking as read:', err);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError('Không thể tải tin nhắn');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() || !partnerId || sending) return;

        const messageToSend = messageText.trim();
        setMessageText('');
        setSending(true);

        try {
            await chatService.sendMessage(partnerId, messageToSend);
            // Refresh messages từ server
            await fetchMessages();
        } catch (err) {
            console.error('Error sending message:', err);
            alert('Có lỗi xảy ra khi gửi tin nhắn');
            // Restore message text nếu có lỗi
            setMessageText(messageToSend);
        } finally {
            setSending(false);
        }
    };

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className={cx('wrapper')}>
                <div className={cx('loading')}>
                    <FontAwesomeIcon icon={faCircle} className="fa-spin" />
                    Đang tải cuộc trò chuyện...
                </div>
            </div>
        );
    }

    if (error && messages.length === 0) {
        return (
            <div className={cx('wrapper')}>
                <div className={cx('error')}>
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className={cx('wrapper')}>
            <div className={cx('chatWindow')}>
                <header className={cx('chatHeader')}>
                    <div className={cx('headerLeft')}>
                        <button
                            className={cx('backButton')}
                            onClick={() => navigate('/customer-support/chat-support')}
                            title="Quay lại"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </button>
                        <div className={cx('headerInfo')}>
                            <div className={cx('nameContainer')}>
                                <h3 className={cx('chatPartnerName')}>
                                    {partnerInfo?.name || 'Khách hàng'}
                                </h3>
                                <div className={cx('chatStatus')}>
                                    Đang hoạt động
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={cx('headerRight')}>
                        <span className={cx('pageTitle')}>Hỗ trợ Chat</span>
                    </div>
                </header>

                <main className={cx('messagesContainer')} ref={messagesContainerRef}>
                    {messages.length === 0 ? (
                        <div className={cx('emptyMessages')}>
                            <p>Chưa có tin nhắn nào trong cuộc trò chuyện này.</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isCurrentUser = msg.senderId === currentUserId;
                            const showDate = index === 0 ||
                                new Date(msg.createdAt).toDateString() !==
                                new Date(messages[index - 1].createdAt).toDateString();

                            return (
                                <div key={msg.id}>
                                    {showDate && (
                                        <div className={cx('dateDivider')}>
                                            <span>{formatDate(msg.createdAt)}</span>
                                        </div>
                                    )}
                                    <div
                                        className={cx('messageWrapper', {
                                            sent: isCurrentUser,
                                            received: !isCurrentUser,
                                        })}
                                    >
                                        <div className={cx('messageBubble')}>
                                            {msg.message}
                                        </div>
                                        <div className={cx('messageTime')}>
                                            {formatTime(msg.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </main>

                <footer className={cx('chatInputWrapper')}>
                    {isDisconnected ? (
                        <div className={cx('disconnectedContainer')}>
                            <FontAwesomeIcon icon={faExclamationCircle} />
                            <span>Khách hàng đã ngắt kết nối. Bạn không thể gửi tin nhắn.</span>
                        </div>
                    ) : (
                        <div className={cx('chatInputContainer')}>
                            <textarea
                                className={cx('messageInput')}
                                placeholder="Nhập tin nhắn..."
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                disabled={sending || isDisconnected}
                                rows={1}
                                autoFocus
                            />
                            <button
                                className={cx('sendButton')}
                                onClick={handleSendMessage}
                                disabled={!messageText.trim() || sending || isDisconnected}
                                title="Gửi tin nhắn"
                            >
                                <FontAwesomeIcon icon={faPaperPlane} />
                            </button>
                        </div>
                    )}
                </footer>
            </div>
        </div>
    );
}

export default ChatDetailPage;

