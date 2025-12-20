import React, { useState, useRef, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './StaffChat.module.scss';
import chatService from '~/services/chat';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import { notify } from '~/utils/notification';

const cx = classNames.bind(styles);

function StaffChat({ onBack, onClose }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [csSupportId, setCsSupportId] = useState(null);
    const [lastMessageId, setLastMessageId] = useState(null);
    const [chatStartTime, setChatStartTime] = useState(null);
    const [isAccepted, setIsAccepted] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const currentUser = storage.get(STORAGE_KEYS.USER);

    // Auto scroll to bottom
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Focus input when component mounts
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Initialize connection when component mounts
    useEffect(() => {
        // Reset state NGAY LẬP TỨC khi mount (không giữ tin nhắn cũ)
        setMessages([]);
        setInputValue('');
        setIsConnecting(false);
        setIsSending(false);
        setCsSupportId(null);
        setLastMessageId(null);
        setChatStartTime(null);
        setIsAccepted(false);
        
        // Connect lại sau khi reset
        const timer = setTimeout(() => {
            handleConnect();
        }, 100);
        
        // Cleanup: Clear messages khi unmount và clear timer
        return () => {
            clearTimeout(timer);
            setMessages([]);
            setInputValue('');
            setIsConnecting(false);
            setIsSending(false);
            setCsSupportId(null);
            setLastMessageId(null);
            setChatStartTime(null);
            setIsAccepted(false);
        };
    }, []); // Chỉ chạy khi component mount (key thay đổi sẽ force re-mount)

    // Polling để lấy tin nhắn mới từ CSKH (chỉ lấy tin nhắn sau khi bắt đầu chat)
    useEffect(() => {
        if (!csSupportId || !currentUser || !chatStartTime) return;

        const fetchNewMessages = async () => {
            try {
                const conversationMessages = await chatService.getConversation(csSupportId);
                
                if (conversationMessages && conversationMessages.length > 0) {
                    // Kiểm tra xem có tin nhắn "Tôi đã tiếp nhận" không
                    const acceptMessage = conversationMessages.find(msg => 
                        msg.message && 
                        msg.message.includes('Tôi đã tiếp nhận yêu cầu hỗ trợ của bạn') &&
                        msg.senderId === csSupportId &&
                        msg.receiverId === currentUser.id
                    );
                    
                    if (acceptMessage) {
                        setIsAccepted(true);
                    }
                    
                    // Lấy danh sách ID tin nhắn hiện có trong state
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        
                        // Lọc tin nhắn mới từ CSKH (chỉ lấy tin nhắn từ CSKH gửi cho khách hàng)
                        // VÀ chỉ lấy tin nhắn được tạo SAU khi bắt đầu chat
                        // VÀ loại bỏ tin nhắn hệ thống (SYSTEM_DISCONNECT)
                        const newMessagesFromCS = conversationMessages
                            .filter(msg => {
                                const messageTime = new Date(msg.createdAt);
                                // Chỉ lấy tin nhắn từ CSKH (sender là CSKH, receiver là khách hàng)
                                // VÀ tin nhắn được tạo sau khi bắt đầu chat
                                // VÀ không phải tin nhắn hệ thống
                                return msg.senderId === csSupportId && 
                                       msg.receiverId === currentUser.id &&
                                       messageTime >= chatStartTime &&
                                       !existingIds.has(msg.id) &&
                                       !(msg.message && msg.message.includes('[SYSTEM_DISCONNECT]'));
                            })
                            .map(msg => ({
                                id: msg.id,
                                type: 'bot',
                                content: msg.message,
                                time: new Date(msg.createdAt)
                            }));

                        if (newMessagesFromCS.length > 0) {
                            // Cập nhật lastMessageId với tin nhắn mới nhất từ CSKH
                            const latestCSMessage = newMessagesFromCS[newMessagesFromCS.length - 1];
                            if (latestCSMessage) {
                                setTimeout(() => setLastMessageId(latestCSMessage.id), 0);
                            }
                            
                            // Thêm tin nhắn mới vào state
                            return [...prev, ...newMessagesFromCS];
                        }
                        
                        return prev;
                    });
                }
            } catch (error) {
                console.warn('Failed to fetch new messages:', error);
            }
        };

        // Polling mỗi 3 giây
        const interval = setInterval(fetchNewMessages, 3000);

        return () => clearInterval(interval);
    }, [csSupportId, currentUser, chatStartTime]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleConnect = async () => {
        setIsConnecting(true);

        // Thêm thông báo "Vui lòng chờ một lúc"
        const waitingMessage = {
            id: Date.now(),
            type: 'bot',
            content: 'Vui lòng chờ một lúc, đang kết nối với nhân viên hỗ trợ...',
            time: new Date()
        };
        setMessages([waitingMessage]);

        try {
            // Kiểm tra đăng nhập
            if (!currentUser) {
                setIsConnecting(false);
                const errorMessage = {
                    id: Date.now() + 1,
                    type: 'bot',
                    content: 'Vui lòng đăng nhập để chat với nhân viên hỗ trợ. Bạn có thể đăng nhập bằng cách click vào biểu tượng tài khoản ở góc trên bên phải.',
                    time: new Date()
                };
                setMessages([errorMessage]);
                window.dispatchEvent(new Event('openLoginModal'));
                return;
            }

            // Lấy CSKH đầu tiên để biết partner ID
            try {
                const csSupport = await chatService.getFirstCustomerSupport();
                if (csSupport && csSupport.id) {
                    setCsSupportId(csSupport.id);
                }
            } catch (csError) {
                console.warn('Failed to get customer support:', csError);
            }

            // Gửi tin nhắn chào ban đầu vào hệ thống chat hỗ trợ
            const welcomeMessage = 'Khách hàng yêu cầu chat trực tiếp với nhân viên hỗ trợ từ chatbot.';
            const senderName = currentUser.name || currentUser.fullName || 'Khách hàng';
            
            try {
                await chatService.sendMessageFromChatbot(
                    welcomeMessage,
                    currentUser.email,
                    senderName
                );
            } catch (chatError) {
                console.warn('Failed to send welcome message to chat:', chatError);
            }

            // Sau 2 giây, chuyển sang chat với nhân viên
            setTimeout(() => {
                setIsConnecting(false);

                // Đặt thời gian bắt đầu chat (để chỉ lấy tin nhắn mới sau thời điểm này)
                setChatStartTime(new Date());

                // Thêm thông báo chào từ nhân viên
                const staffMessage = {
                    id: Date.now() + 1,
                    type: 'bot',
                    content: 'Xin chào! Tôi là nhân viên hỗ trợ của Nova Beauty. Yêu cầu của bạn đã được gửi đến CSKH. Nhân viên sẽ phản hồi sớm nhất có thể. Bạn có thể mô tả chi tiết vấn đề bạn cần hỗ trợ ạ?',
                    time: new Date()
                };
                setMessages([staffMessage]);
            }, 2000);
        } catch (error) {
            console.error('Error connecting to chat:', error);
            setIsConnecting(false);

            // Thông báo lỗi
            const errorMessage = {
                id: Date.now() + 1,
                type: 'bot',
                content: 'Xin lỗi, có lỗi xảy ra khi kết nối với nhân viên hỗ trợ. Vui lòng thử lại sau hoặc liên hệ hotline 1900 636 467 để được hỗ trợ.',
                time: new Date()
            };
            setMessages([errorMessage]);
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isSending || !currentUser) return;

        const messageContent = inputValue.trim();
        
        // Thêm user message vào state ngay lập tức (chỉ lưu tạm, không lưu vào database)
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: messageContent,
            time: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsSending(true);

        try {
            // Gửi tin nhắn vào hệ thống chat hỗ trợ (lưu vào database)
            const senderName = currentUser.name || currentUser.fullName || 'Khách hàng';
            
            try {
                await chatService.sendMessageFromChatbot(
                    messageContent,
                    currentUser.email,
                    senderName
                );
                
                // Thêm thông báo xác nhận (chỉ hiển thị tạm, không lưu vào database)
                const confirmMessage = {
                    id: Date.now() + 1,
                    type: 'bot',
                    content: 'Cảm ơn bạn! Tin nhắn của bạn đã được gửi đến CSKH. Nhân viên sẽ phản hồi sớm nhất có thể (trong giờ làm việc 8:00 - 22:00).',
                    time: new Date()
                };
                setMessages(prev => [...prev, confirmMessage]);
            } catch (chatError) {
                console.warn('Failed to send message to chat:', chatError);
                const errorMessage = {
                    id: Date.now() + 1,
                    type: 'bot',
                    content: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau hoặc liên hệ hotline 1900 636 467 để được hỗ trợ.',
                    time: new Date()
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = {
                id: Date.now() + 1,
                type: 'bot',
                content: 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau hoặc liên hệ hotline 1900 636 467 để được hỗ trợ.',
                time: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDisconnect = async () => {
        // Hiển thị dialog xác nhận
        const confirmed = await notify.confirm(
            'Bạn muốn ngắt kết nối?',
            'Ngắt kết nối',
            'Ngắt kết nối',
            'Hủy'
        );

        if (confirmed) {
            // Gửi tin nhắn thông báo cho CSKH rằng khách hàng đã ngắt kết nối
            if (currentUser && csSupportId) {
                try {
                    const senderName = currentUser.name || currentUser.fullName || 'Khách hàng';
                    await chatService.sendMessageFromChatbot(
                        '[SYSTEM_DISCONNECT] Khách hàng đã ngắt kết nối',
                        currentUser.email,
                        senderName
                    );
                } catch (error) {
                    console.warn('Failed to send disconnect message:', error);
                }
            }

            // Reset tin nhắn (xóa tất cả tin nhắn cũ - chỉ lưu tạm ở client)
            setMessages([]);
            setInputValue('');
            setIsSending(false);
            setIsConnecting(false);
            setChatStartTime(null);

            return true; // Đã xác nhận ngắt kết nối
        }
        
        return false; // Không xác nhận
    };

    const handleClose = async () => {
        const disconnected = await handleDisconnect();
        if (disconnected && onClose) {
            onClose();
        }
    };

    const handleBack = async () => {
        const disconnected = await handleDisconnect();
        if (disconnected && onBack) {
            onBack();
        }
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <button className={cx('backBtn')} onClick={handleBack}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                </button>
                <div className={cx('headerInfo')}>
                    <h3>Nhân viên hỗ trợ Nova Beauty</h3>
                    <p>{isAccepted ? 'Đã được tiếp nhận' : 'Đang kết nối...'}</p>
                </div>
                <button className={cx('closeBtn')} onClick={handleClose}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>
            </div>

            <div className={cx('chatBody')}>
                {isConnecting && (
                    <div className={cx('connectingOverlay')}>
                        <div className={cx('spinner')}></div>
                        <p>Đang kết nối với nhân viên hỗ trợ...</p>
                    </div>
                )}

                {messages
                    .filter(message => !(message.content && message.content.includes('[SYSTEM_DISCONNECT]')))
                    .map((message) => (
                        <div
                            key={message.id}
                            className={cx('message', message.type)}
                        >
                            <div className={cx('messageContent')}>
                                {message.content}
                            </div>
                            <span className={cx('messageTime')}>
                                {formatTime(message.time)}
                            </span>
                        </div>
                    ))}
                <div ref={messagesEndRef} />
            </div>

            <div className={cx('chatInput')}>
                <textarea
                    ref={inputRef}
                    className={cx('input')}
                    placeholder="Nhập tin nhắn của bạn..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isSending || isConnecting || !currentUser}
                    rows={1}
                />
                <button
                    className={cx('sendBtn')}
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isSending || isConnecting || !currentUser}
                >
                    {isSending ? (
                        <div className={cx('spinner', 'small')}></div>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}

export default StaffChat;
