import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './ChatButton.module.scss';
import chatbotService from '~/services/chatbot';
import chatService from '~/services/chat';
import { getActiveProducts } from '~/services/product';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import { notify } from '~/utils/notification';
import StaffChat from '~/components/Common/StaffChat';

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
    const [useAI, setUseAI] = useState(true); // Toggle giữa AI và staff chat
    const [staffChatKey, setStaffChatKey] = useState(0); // Key để force re-mount StaffChat
    const [allProducts, setAllProducts] = useState([]);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const currentUser = storage.get(STORAGE_KEYS.USER);

    /**
     * Parse message content để render links và product cards
     */
    const renderMessageContent = (message) => {
        const { content, products } = message;
        if (!content && !products) return null;

        let messageText = content;

        // Render product grid if available
        const renderProductGrid = (productList) => {
            if (!productList || productList.length === 0) return null;
            return (
                <div className={cx('productGrid')}>
                    {productList.map(product => (
                        <div key={product.id} className={cx('productCard')}>
                            <img
                                src={product.defaultMediaUrl || product.imageUrl}
                                alt={product.name}
                                className={cx('productImg')}
                            />
                            <div className={cx('productInfo')}>
                                <h5>{product.name}</h5>
                                <div className={cx('productPrice')}>
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                                </div>
                                <p className={cx('productDesc')}>
                                    {product.reviewHighlights || product.uses || product.description || 'Sản phẩm chính hãng từ Nova Beauty'}
                                </p>
                            </div>
                            <button
                                className={cx('viewBtn')}
                                onClick={() => {
                                    navigate(`/product/${product.id}`);
                                    setIsOpen(false);
                                }}
                            >
                                Xem chi tiết
                            </button>
                        </div>
                    ))}
                </div>
            );
        };

        if (!messageText) return renderProductGrid(products);

        // Pattern để tìm [LINK:/path]
        const linkPattern = /\[LINK:([^\]]+)\]/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = linkPattern.exec(messageText)) !== null) {
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: messageText.substring(lastIndex, match.index)
                });
            }

            const path = match[1];
            let linkText = 'Xem tại đây';
            if (path === '/promo') {
                linkText = 'Xem trang Khuyến mãi';
            } else if (path === '/vouchers') {
                linkText = 'Xem trang Voucher';
            } else if (path === '/profile?section=orders') {
                linkText = 'truy cập mục "Lịch sử mua hàng"';
            }

            parts.push({
                type: 'link',
                path: path,
                text: linkText
            });

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < messageText.length) {
            parts.push({
                type: 'text',
                content: messageText.substring(lastIndex)
            });
        }

        return (
            <>
                {parts.length > 0 ? (
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
                                                setIsOpen(false);
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
                ) : (
                    <p>{messageText}</p>
                )}
                {renderProductGrid(products)}
            </>
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

        // Load products for local consultation
        if (isOpen && allProducts.length === 0) {
            const loadProducts = async () => {
                try {
                    const data = await getActiveProducts();
                    setAllProducts(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error('Failed to load products for chatbot:', err);
                }
            };
            loadProducts();
        }
    }, [isOpen, allProducts.length]);

    const toggleChat = async () => {
        const wasOpen = isOpen;

        // Nếu đang đóng chat và đang ở chế độ staff chat, hiển thị popup xác nhận
        if (wasOpen && !useAI) {
            const confirmed = await notify.confirm(
                'Bạn muốn ngắt kết nối?',
                'Ngắt kết nối',
                'Ngắt kết nối',
                'Hủy'
            );

            if (!confirmed) {
                return; // Không đóng nếu hủy
            }

            // Gửi thông báo ngắt kết nối cho CSKH
            const currentUser = storage.get(STORAGE_KEYS.USER);
            if (currentUser) {
                try {
                    const senderName = currentUser.name || currentUser.fullName || 'Khách hàng';
                    await chatService.sendMessageFromChatbot(
                        '[Khách hàng đã ngắt kết nối]',
                        currentUser.email,
                        senderName
                    );
                } catch (error) {
                    console.warn('Failed to send disconnect message:', error);
                }
            }
        }

        // Nếu đang đóng chat, reset về trạng thái ban đầu NGAY LẬP TỨC
        if (wasOpen) {
            // Reset ngay lập tức trước khi đóng
            setMessages([
                {
                    id: 1,
                    type: 'bot',
                    content: 'Xin chào! 👋 Tôi là trợ lý AI của Nova Beauty. Tôi có thể giúp bạn tư vấn sản phẩm, giải đáp thắc mắc về đơn hàng, chính sách đổi trả và nhiều hơn nữa. Bạn cần hỗ trợ gì hôm nay?',
                    time: new Date()
                }
            ]);
            setInputValue('');
            setShowQuickReplies(true);
            setSessionId(null);
            setUseAI(true); // Reset về AI chat
            setStaffChatKey(prev => prev + 1); // Force re-mount StaffChat (unmount component cũ)
        }

        setIsOpen(!isOpen);

        // Nếu mở lại và đang ở chế độ staff chat, force re-mount
        if (!wasOpen && !useAI) {
            setStaffChatKey(prev => prev + 1);
        }
    };

    const handleRefreshChat = () => {
        // Reset messages to initial state
        setMessages([
            {
                id: 1,
                type: 'bot',
                content: 'Xin chào! 👋 Tôi là trợ lý AI của Nova Beauty. Tôi có thể giúp bạn tư vấn sản phẩm, giải đáp thắc mắc về đơn hàng, chính sách đổi trả và nhiều hơn nữa. Bạn cần hỗ trợ gì hôm nay?',
                time: new Date()
            }
        ]);
        setInputValue('');
        setShowQuickReplies(true);
        setSessionId(null);
        setUseAI(true);
    };

    const handleConnectToStaff = () => {
        setUseAI(false);
    };

    const handleBackToAI = () => {
        setUseAI(true);
        // Force re-mount StaffChat khi quay lại AI để đảm bảo reset hoàn toàn
        setStaffChatKey(prev => prev + 1);
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

    const addBotMessage = (content, products = [], delay = 1000) => {
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now(),
                type: 'bot',
                content,
                products,
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
                botResponse = 'Để kiểm tra tình trạng đơn hàng, bạn vui lòng cung cấp mã đơn hàng hoặc [LINK:/profile?section=orders] để xem lịch sử mua hàng trong tài khoản nhé!';
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
            // Chỉ xử lý khi đang dùng AI (chat với nhân viên đã được tách ra StaffChat component)
            if (useAI) {
                const response = await chatbotService.ask(messageContent, sessionId);

                // Lưu sessionId nếu có
                if (response.sessionId && !sessionId) {
                    setSessionId(response.sessionId);
                }

                // Check for consultation triggers
                const lowerMsg = messageContent.toLowerCase();
                const isConsultation = lowerMsg.includes('tư vấn') ||
                    lowerMsg.includes('gợi ý') ||
                    lowerMsg.includes('sản phẩm nào') ||
                    lowerMsg.includes('tìm giúp') ||
                    lowerMsg.includes('xem sản phẩm') ||
                    lowerMsg.includes('muốn xem') ||
                    lowerMsg.includes('tìm sản phẩm');

                let suggestedProducts = [];
                if (isConsultation && allProducts.length > 0) {
                    // Simple keyword matching with randomization for variety
                    const keywords = messageContent.split(' ').filter(k => k.length >= 2);
                    const matches = allProducts.filter(p => {
                        const searchStr = `${p.name} ${p.reviewHighlights || ''} ${p.description || ''} ${p.uses || ''}`.toLowerCase();
                        return keywords.some(k => searchStr.includes(k.toLowerCase()));
                    });

                    // Shuffle and pick at most 3
                    suggestedProducts = matches
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 3);
                }

                // Add bot response từ AI
                let finalReply = response.reply;
                if (suggestedProducts.length > 0) {
                    finalReply = 'Tôi có một vài sản phẩm gợi ý theo ý bạn, bạn có thể tham khảo qua nhé:';
                }

                addBotMessage(finalReply, suggestedProducts);
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
                                <h4>{useAI ? 'Trợ lý AI Nova Beauty' : 'Nhân viên hỗ trợ Nova Beauty'}</h4>
                                {useAI && (
                                    <span className={cx('status')}>
                                        <span className={cx('statusDot')}></span>
                                        Trực tuyến
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className={cx('headerActions')}>
                            <button className={cx('refreshBtn')} onClick={handleRefreshChat} title="Làm mới cuộc trò chuyện">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                                </svg>
                            </button>
                            <button className={cx('closeBtn')} onClick={toggleChat}>
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {useAI ? (
                        <>
                            <div className={cx('chatBody')}>
                                {/* Nút Chat với nhân viên - chỉ hiển thị khi đang dùng AI */}
                                <div className={cx('staffSupportCard')}>
                                    <div className={cx('supportCardContent')}>
                                        <div className={cx('supportIcon')}>
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                            </svg>
                                        </div>
                                        <div className={cx('supportText')}>
                                            <h5>Cần hỗ trợ từ nhân viên?</h5>
                                            <p>Nhân viên tư vấn sẵn sàng giải đáp thắc mắc chuyên sâu của bạn.</p>
                                        </div>
                                    </div>
                                    <button
                                        className={cx('connectStaffBtn')}
                                        onClick={handleConnectToStaff}
                                    >
                                        <span>Kết nối ngay</span>
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                                        </svg>
                                    </button>
                                </div>

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
                                                    {renderMessageContent(message)}
                                                    <span className={cx('messageTime')}>{formatTime(message.time)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Quick Replies */}
                                {showQuickReplies && (
                                    <div className={cx('quickReplies')}>
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
                        </>
                    ) : (
                        isOpen && (
                            <StaffChat
                                key={staffChatKey}
                                onBack={handleBackToAI}
                                onClose={toggleChat}
                            />
                        )
                    )}
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
