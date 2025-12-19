import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './ChatButton.module.scss';
import ticketService from '~/services/ticket';
import chatbotService from '~/services/chatbot';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';

const cx = classNames.bind(styles);

function ChatButton() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            content: 'Xin chào! 👋 Tôi là trợ lý AI của Nova Beauty. Tôi có thể giúp bạn tư vấn sản phẩm, giải đáp thắc mắc về đơn hàng, chính sách đổi trả và nhiều hơn nữa. Bạn cần hỗ trợ gì hôm nay?',
            time: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(true);
    const [sessionId, setSessionId] = useState(null);
    const [useAI, setUseAI] = useState(true); // Toggle giữa AI và ticket
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const currentUser = storage.get(STORAGE_KEYS.USER);

    /**
     * Parse message content để render links
     * Format: [LINK:/promo] sẽ được convert thành clickable link
     */
    const renderMessageContent = (content) => {
        if (!content) return null;
        
        // Pattern để tìm [LINK:/path]
        const linkPattern = /\[LINK:([^\]]+)\]/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = linkPattern.exec(content)) !== null) {
            // Thêm text trước link
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: content.substring(lastIndex, match.index)
                });
            }
            
            // Thêm link
            const path = match[1];
            let linkText = 'Xem tại đây';
            if (path === '/promo') {
                linkText = 'Xem trang Khuyến mãi';
            } else if (path === '/vouchers') {
                linkText = 'Xem trang Voucher';
            }
            
            parts.push({
                type: 'link',
                path: path,
                text: linkText
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        // Thêm phần text còn lại
        if (lastIndex < content.length) {
            parts.push({
                type: 'text',
                content: content.substring(lastIndex)
            });
        }
        
        // Nếu không có link, trả về text thuần
        if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
            return <p>{content}</p>;
        }
        
        // Render với links
        return (
            <p>
                {parts.map((part, index) => {
                    if (part.type === 'link') {
                        return (
                            <React.Fragment key={index}>
                                {' '}
                                <a
                                    href={part.path}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate(part.path);
                                        setIsOpen(false); // Đóng chat khi click link
                                    }}
                                    className={cx('chatLink')}
                                >
                                    {part.text}
                                </a>
                            </React.Fragment>
                        );
                    }
                    return <React.Fragment key={index}>{part.content}</React.Fragment>;
                })}
            </p>
        );
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const quickReplies = [
        { id: 1, text: 'Tình trạng đơn hàng', icon: '📦' },
        { id: 2, text: 'Đổi trả sản phẩm', icon: '🔄' },
        { id: 3, text: 'Khiếu nại', icon: '⚠️' },
        { id: 4, text: 'Tư vấn sản phẩm', icon: '💄' },
    ];

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const addBotMessage = (content, delay = 1000) => {
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'bot',
                content,
                time: new Date()
            }]);
        }, delay);
    };

    const handleQuickReply = (reply) => {
        setShowQuickReplies(false);

        // Add user message
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: reply.text,
            time: new Date()
        };
        setMessages(prev => [...prev, userMessage]);

        // Bot response based on quick reply
        let botResponse = '';
        switch (reply.id) {
            case 1:
                botResponse = 'Để kiểm tra tình trạng đơn hàng, bạn vui lòng cung cấp mã đơn hàng hoặc truy cập mục "Đơn hàng của tôi" trong tài khoản nhé!';
                break;
            case 2:
                botResponse = 'Nova Beauty hỗ trợ đổi trả trong vòng 7 ngày với sản phẩm còn nguyên seal. Bạn muốn đổi trả sản phẩm nào ạ?';
                break;
            case 3:
                botResponse = 'Rất tiếc về sự bất tiện này! Vui lòng mô tả chi tiết vấn đề bạn gặp phải để chúng tôi hỗ trợ nhanh nhất.';
                break;
            case 4:
                botResponse = 'Tuyệt vời! Bạn đang quan tâm đến dòng sản phẩm nào? (Skincare, Makeup, Nước hoa, Chăm sóc tóc...)';
                break;
            default:
                botResponse = 'Cảm ơn bạn đã liên hệ! Nhân viên CSKH sẽ phản hồi sớm nhất.';
        }
        addBotMessage(botResponse);
    };

    const handleSendMessage = async () => {
        // Prevent multiple simultaneous requests
        if (!inputValue.trim() || isSending) return;
        
        // Debounce: Prevent rapid-fire requests
        if (Date.now() - (handleSendMessage.lastCallTime || 0) < 1000) {
            return; // Ignore if called within 1 second
        }
        handleSendMessage.lastCallTime = Date.now();

        const messageContent = inputValue.trim();
        setInputValue('');
        setShowQuickReplies(false);

        // Add user message
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: messageContent,
            time: new Date()
        };
        setMessages(prev => [...prev, userMessage]);

        setIsSending(true);

        try {
            // Sử dụng AI Chatbot để trả lời
            if (useAI) {
                const response = await chatbotService.ask(messageContent, sessionId);
                
                // Lưu sessionId nếu có
                if (response.sessionId && !sessionId) {
                    setSessionId(response.sessionId);
                }

                // Add bot response từ AI
                addBotMessage(response.reply);
            } else {
                // Fallback: Create ticket với thông tin user nếu đã đăng nhập
                if (currentUser) {
                    // Chỉ gửi phone nếu có giá trị hợp lệ
                    const ticketData = {
                        customerName: currentUser.name || currentUser.fullName || 'Khách hàng',
                        email: currentUser.email || '',
                        orderCode: 'KHAC',
                        topic: 'Chat hỗ trợ',
                        content: messageContent,
                    };
                    
                    // Chỉ thêm phone nếu có và không rỗng
                    if (currentUser.phone && currentUser.phone.trim()) {
                        ticketData.phone = currentUser.phone.trim();
                    }

                    await ticketService.createTicket(ticketData);

                    addBotMessage('Cảm ơn bạn! Tin nhắn của bạn đã được ghi nhận. Nhân viên CSKH sẽ phản hồi qua email hoặc điện thoại trong thời gian sớm nhất (trong giờ làm việc 8:00 - 22:00).');
                } else {
                    // Nếu chưa đăng nhập, hướng dẫn đăng nhập hoặc gửi form
                    addBotMessage('Để được hỗ trợ nhanh nhất, bạn vui lòng đăng nhập hoặc truy cập trang Hỗ trợ khách hàng để gửi yêu cầu chi tiết nhé!');

                    setTimeout(() => {
                        setMessages(prev => [...prev, {
                            id: Date.now(),
                            type: 'bot',
                            content: 'action_buttons',
                            time: new Date()
                        }]);
                    }, 1500);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            addBotMessage('Xin lỗi, có lỗi xảy ra khi xử lý tin nhắn của bạn. Vui lòng thử lại sau hoặc liên hệ hotline 1900 636 467 để được hỗ trợ.');
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

    const triggerLogin = () => {
        window.dispatchEvent(new CustomEvent('openLoginModal'));
        setIsOpen(false);
    };

    return (
        <div className={cx('wrapper')}>
            {/* Chat Popup */}
            {isOpen && (
                <div className={cx('chatPopup')}>
                    <div className={cx('chatHeader')}>
                        <div className={cx('headerInfo')}>
                            <div className={cx('avatar')}>
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                </svg>
                            </div>
                            <div className={cx('headerText')}>
                                <h4>Trợ lý AI Nova Beauty</h4>
                                <span className={cx('status')}>
                                    <span className={cx('statusDot')}></span>
                                    Trực tuyến
                                </span>
                            </div>
                        </div>
                        <button className={cx('closeBtn')} onClick={toggleChat}>
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>
                    </div>

                    <div className={cx('chatBody')}>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={cx('messageWrapper', message.type)}
                            >
                                {message.type === 'bot' && (
                                    <div className={cx('botAvatar')}>
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                                        </svg>
                                    </div>
                                )}
                                <div className={cx('messageContent', message.type)}>
                                    {message.content === 'action_buttons' ? (
                                        <div className={cx('actionButtons')}>
                                            <button onClick={triggerLogin} className={cx('actionBtn', 'primary')}>
                                                Đăng nhập
                                            </button>
                                            <a href="/support" className={cx('actionBtn', 'secondary')}>
                                                Trang hỗ trợ
                                            </a>
                                        </div>
                                    ) : (
                                        <>
                                            {renderMessageContent(message.content)}
                                            <span className={cx('messageTime')}>{formatTime(message.time)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Quick Replies */}
                        {showQuickReplies && (
                            <div className={cx('quickReplies')}>
                                <p className={cx('quickRepliesTitle')}>Bạn cần hỗ trợ về:</p>
                                <div className={cx('quickReplyButtons')}>
                                    {quickReplies.map((reply) => (
                                        <button
                                            key={reply.id}
                                            className={cx('quickReplyBtn')}
                                            onClick={() => handleQuickReply(reply)}
                                        >
                                            <span>{reply.icon}</span>
                                            {reply.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Typing indicator */}
                        {isSending && (
                            <div className={cx('messageWrapper', 'bot')}>
                                <div className={cx('botAvatar')}>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                                    </svg>
                                </div>
                                <div className={cx('typingIndicator')}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className={cx('chatInputArea')}>
                        <div className={cx('inputWrapper')}>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Nhập câu hỏi của bạn..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isSending}
                                className={cx('chatInput')}
                            />
                            <button
                                className={cx('sendBtn', { disabled: !inputValue.trim() || isSending })}
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isSending}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        </div>
                        <p className={cx('inputHint')}>
                            Nhấn Enter để gửi • Trợ lý AI luôn sẵn sàng hỗ trợ bạn
                        </p>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                className={cx('floatingBtn', { active: isOpen })}
                onClick={toggleChat}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {isOpen ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className={cx('icon')}>
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className={cx('icon')}>
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                    </svg>
                )}

                {/* Tooltip */}
                {!isOpen && isHovered && (
                    <span className={cx('tooltip')}>Chat với AI</span>
                )}
            </button>

            {/* Pulse effect when not open */}
            {!isOpen && <span className={cx('pulse')}></span>}
        </div>
    );
}

export default ChatButton;
