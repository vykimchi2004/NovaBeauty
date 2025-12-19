import React, { useState, useRef, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './Chatbot.module.scss';
import chatbotService from '~/services/chatbot';

const cx = classNames.bind(styles);

function Chatbot() {
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
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

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

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const addBotMessage = (content) => {
        const botMessage = {
            id: Date.now(),
            type: 'bot',
            content,
            time: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const messageContent = inputValue.trim();
        setInputValue('');

        // Add user message
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: messageContent,
            time: new Date()
        };
        setMessages(prev => [...prev, userMessage]);

        setIsLoading(true);

        try {
            const response = await chatbotService.ask(messageContent, sessionId);
            
            // Lưu sessionId nếu có
            if (response.sessionId && !sessionId) {
                setSessionId(response.sessionId);
            }

            // Add bot response
            addBotMessage(response.reply);
        } catch (error) {
            console.error('Error sending message:', error);
            addBotMessage('Xin lỗi, có lỗi xảy ra khi xử lý tin nhắn của bạn. Vui lòng thử lại sau hoặc liên hệ hotline 1900 636 467 để được hỗ trợ.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
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
                                    <p>{message.content}</p>
                                    <span className={cx('messageTime')}>{formatTime(message.time)}</span>
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isLoading && (
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
                                disabled={isLoading}
                                className={cx('chatInput')}
                            />
                            <button
                                className={cx('sendBtn', { disabled: !inputValue.trim() || isLoading })}
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
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

export default Chatbot;


