package com.hanoi_metro.backend.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hanoi_metro.backend.dto.request.SendMessageRequest;
import com.hanoi_metro.backend.dto.response.ChatConversationResponse;
import com.hanoi_metro.backend.dto.response.ChatMessageResponse;
import com.hanoi_metro.backend.dto.response.UserResponse;
import com.hanoi_metro.backend.entity.ChatMessage;
import com.hanoi_metro.backend.entity.User;
import com.hanoi_metro.backend.exception.AppException;
import com.hanoi_metro.backend.exception.ErrorCode;
import com.hanoi_metro.backend.repository.ChatMessageRepository;
import com.hanoi_metro.backend.repository.UserRepository;
import com.hanoi_metro.backend.util.SecurityUtil;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ChatService {

    ChatMessageRepository chatMessageRepository;
    UserRepository userRepository;
    NotificationService notificationService;

    @Transactional
    @PreAuthorize("hasAnyRole('CUSTOMER', 'CUSTOMER_SUPPORT')")
    public ChatMessageResponse sendMessage(SendMessageRequest request) {
        String currentUserEmail = SecurityUtil.getCurrentUserEmail();
        User sender =
                userRepository
                        .findByEmail(currentUserEmail)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        User receiver =
                userRepository
                        .findById(request.getReceiverId())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Kiểm tra: Customer chỉ có thể chat với CSKH, CSKH có thể chat với bất kỳ ai
        if (sender.getRole() != null && sender.getRole().getName().equals("CUSTOMER")) {
            if (receiver.getRole() == null
                    || !receiver.getRole().getName().equals("CUSTOMER_SUPPORT")) {
                throw new AppException(
                        ErrorCode.UNCATEGORIZED_EXCEPTION,
                        "Khách hàng chỉ có thể chat với nhân viên CSKH");
            }
        }

        ChatMessage chatMessage =
                ChatMessage.builder()
                        .message(request.getMessage().trim())
                        .sender(sender)
                        .receiver(receiver)
                        .isRead(false)
                        .createdAt(LocalDateTime.now())
                        .build();

        ChatMessage saved = chatMessageRepository.save(chatMessage);

        // Gửi notification cho người nhận
        try {
            notificationService.sendToUsers(
                    "Tin nhắn mới",
                    String.format(
                            "Bạn có tin nhắn mới từ %s",
                            sender.getFullName() != null
                                    ? sender.getFullName()
                                    : sender.getEmail()),
                    "CHAT",
                    java.util.Set.of(receiver.getId()));
        } catch (Exception e) {
            log.error("Failed to send notification for chat message: {}", e.getMessage());
        }

        return toResponse(saved);
    }

    /**
     * Gửi tin nhắn từ chatbot (public endpoint - không cần authentication)
     * Tự động tìm CSKH đầu tiên và gửi tin nhắn
     */
    @Transactional
    public ChatMessageResponse sendMessageFromChatbot(String message, String senderEmail, String senderName) {
        // Tìm user sender theo email
        User sender = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED, "Không tìm thấy người dùng với email: " + senderEmail));

        // Tìm CSKH đầu tiên
        List<User> csUsers = userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && "CUSTOMER_SUPPORT".equals(u.getRole().getName()))
                .filter(User::isActive)
                .toList();

        if (csUsers.isEmpty()) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Không tìm thấy nhân viên CSKH");
        }

        User receiver = csUsers.get(0);

        // Tạo chat message
        ChatMessage chatMessage = ChatMessage.builder()
                .message(message.trim())
                .sender(sender)
                .receiver(receiver)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        ChatMessage saved = chatMessageRepository.save(chatMessage);

        // Gửi notification cho CSKH
        try {
            notificationService.sendToUsers(
                    "Tin nhắn mới từ chatbot",
                    String.format("Bạn có tin nhắn mới từ %s (qua chatbot)", 
                            senderName != null ? senderName : sender.getFullName() != null ? sender.getFullName() : sender.getEmail()),
                    "CHAT",
                    java.util.Set.of(receiver.getId()));
        } catch (Exception e) {
            log.error("Failed to send notification for chatbot message: {}", e.getMessage());
        }

        return toResponse(saved);
    }

    @PreAuthorize("hasAnyRole('CUSTOMER', 'CUSTOMER_SUPPORT')")
    public List<ChatMessageResponse> getConversation(String partnerId) {
        String currentUserEmail = SecurityUtil.getCurrentUserEmail();
        User currentUser =
                userRepository
                        .findByEmail(currentUserEmail)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        User partner =
                userRepository
                        .findById(partnerId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<ChatMessage> messages;
        
        // Nếu là CSKH và partner là CUSTOMER, lấy TẤT CẢ messages của customer với bất kỳ CSKH nào
        // Để tất cả CSKH đều thấy cùng trạng thái
        if (currentUser.getRole() != null 
                && "CUSTOMER_SUPPORT".equals(currentUser.getRole().getName())
                && partner.getRole() != null
                && "CUSTOMER".equals(partner.getRole().getName())) {
            messages = chatMessageRepository.findCustomerConversationWithAnySupport(partner.getId());
        } 
        // Nếu là CUSTOMER và partner là CSKH, lấy TẤT CẢ messages của customer với bất kỳ CSKH nào
        // Để customer thấy tất cả tin nhắn từ mọi CSKH
        else if (currentUser.getRole() != null 
                && "CUSTOMER".equals(currentUser.getRole().getName())
                && partner.getRole() != null
                && "CUSTOMER_SUPPORT".equals(partner.getRole().getName())) {
            messages = chatMessageRepository.findCustomerConversationWithAnySupport(currentUser.getId());
        } 
        else {
            // Trường hợp khác, lấy messages giữa currentUser và partner
            messages = chatMessageRepository.findConversationBetweenUsers(
                    currentUser.getId(), partner.getId());
        }

        return messages.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @PreAuthorize("hasAnyRole('CUSTOMER', 'CUSTOMER_SUPPORT')")
    public List<ChatConversationResponse> getConversations() {
        String currentUserEmail = SecurityUtil.getCurrentUserEmail();
        User currentUser =
                userRepository
                        .findByEmail(currentUserEmail)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<User> partners;
        
        // Nếu là CSKH, lấy TẤT CẢ customers có conversation với bất kỳ CSKH nào
        if (currentUser.getRole() != null && "CUSTOMER_SUPPORT".equals(currentUser.getRole().getName())) {
            List<User> customersAsSender = chatMessageRepository.findCustomersAsSender();
            List<User> customersAsReceiver = chatMessageRepository.findCustomersAsReceiver();
            
            // Kết hợp và loại bỏ duplicate
            java.util.Set<String> partnerIds = new java.util.HashSet<>();
            partners = new java.util.ArrayList<>();
            
            for (User customer : customersAsSender) {
                if (!partnerIds.contains(customer.getId())) {
                    partnerIds.add(customer.getId());
                    partners.add(customer);
                }
            }
            for (User customer : customersAsReceiver) {
                if (!partnerIds.contains(customer.getId())) {
                    partnerIds.add(customer.getId());
                    partners.add(customer);
                }
            }
        } else {
            // Nếu là CUSTOMER, giữ nguyên logic cũ
            List<User> partnersAsSender =
                    chatMessageRepository.findChatPartnersAsSender(currentUser.getId());
            List<User> partnersAsReceiver =
                    chatMessageRepository.findChatPartnersAsReceiver(currentUser.getId());

            // Kết hợp và loại bỏ duplicate
            java.util.Set<String> partnerIds = new java.util.HashSet<>();
            partners = new java.util.ArrayList<>();

            for (User partner : partnersAsSender) {
                if (!partnerIds.contains(partner.getId())) {
                    partnerIds.add(partner.getId());
                    partners.add(partner);
                }
            }
            for (User partner : partnersAsReceiver) {
                if (!partnerIds.contains(partner.getId())) {
                    partnerIds.add(partner.getId());
                    partners.add(partner);
                }
            }
        }

        return partners.stream()
                .map(
                        partner -> {
                            List<ChatMessage> messages;
                            
                            // Nếu là CSKH, lấy TẤT CẢ messages của customer với bất kỳ CSKH nào
                            if (currentUser.getRole() != null && "CUSTOMER_SUPPORT".equals(currentUser.getRole().getName())) {
                                messages = chatMessageRepository.findCustomerConversationWithAnySupport(partner.getId());
                            } else {
                                // Nếu là CUSTOMER, lấy messages giữa currentUser và partner
                                messages = chatMessageRepository.findConversationBetweenUsers(
                                        currentUser.getId(), partner.getId());
                            }

                            ChatMessage lastMessage =
                                    messages.isEmpty()
                                            ? null
                                            : messages.get(messages.size() - 1);

                            // Đếm unread từ partner này (chỉ đếm messages mà currentUser là receiver)
                            Long unreadFromPartner =
                                    messages.stream()
                                            .filter(
                                                    m ->
                                                            m.getReceiver()
                                                                            .getId()
                                                                            .equals(
                                                                                    currentUser
                                                                                            .getId())
                                                                    && !m.getIsRead())
                                            .count();

                            return ChatConversationResponse.builder()
                                    .partnerId(partner.getId())
                                    .partnerName(
                                            partner.getFullName() != null
                                                    ? partner.getFullName()
                                                    : partner.getEmail())
                                    .partnerEmail(partner.getEmail())
                                    .lastMessage(
                                            lastMessage != null
                                                    ? lastMessage.getMessage()
                                                    : null)
                                    .lastMessageTime(
                                            lastMessage != null
                                                    ? lastMessage.getCreatedAt()
                                                    : null)
                                    .unreadCount(unreadFromPartner)
                                    .messages(
                                            messages.stream()
                                                    .map(this::toResponse)
                                                    .collect(Collectors.toList()))
                                    .build();
                        })
                .sorted(
                        (a, b) -> {
                            // Sắp xếp theo thời gian tin nhắn cuối cùng (mới nhất trước)
                            if (a.getLastMessageTime() == null
                                    && b.getLastMessageTime() == null) return 0;
                            if (a.getLastMessageTime() == null) return 1;
                            if (b.getLastMessageTime() == null) return -1;
                            return b.getLastMessageTime().compareTo(a.getLastMessageTime());
                        })
                .collect(Collectors.toList());
    }

    @Transactional
    @PreAuthorize("hasAnyRole('CUSTOMER', 'CUSTOMER_SUPPORT')")
    public void markAsRead(String partnerId) {
        String currentUserEmail = SecurityUtil.getCurrentUserEmail();
        User currentUser =
                userRepository
                        .findByEmail(currentUserEmail)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        User partner =
                userRepository
                        .findById(partnerId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<ChatMessage> unreadMessages =
                chatMessageRepository.findConversationBetweenUsers(
                                currentUser.getId(), partner.getId()).stream()
                        .filter(
                                m ->
                                        m.getReceiver()
                                                        .getId()
                                                        .equals(currentUser.getId())
                                                && !m.getIsRead())
                        .collect(Collectors.toList());

        for (ChatMessage message : unreadMessages) {
            message.setIsRead(true);
            message.setReadAt(LocalDateTime.now());
            chatMessageRepository.save(message);
        }
    }

    @PreAuthorize("hasAnyRole('CUSTOMER', 'CUSTOMER_SUPPORT')")
    public Long getUnreadCount() {
        String currentUserEmail = SecurityUtil.getCurrentUserEmail();
        User currentUser =
                userRepository
                        .findByEmail(currentUserEmail)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return chatMessageRepository.countUnreadMessages(currentUser.getId());
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    public UserResponse getFirstCustomerSupport() {
        // Tìm CSKH đầu tiên
        List<User> csUsers =
                userRepository.findAll().stream()
                        .filter(
                                u ->
                                        u.getRole() != null
                                                && "CUSTOMER_SUPPORT"
                                                        .equals(u.getRole().getName()))
                        .filter(User::isActive)
                        .toList();

        if (csUsers.isEmpty()) {
            throw new AppException(
                    ErrorCode.UNCATEGORIZED_EXCEPTION, "Không tìm thấy nhân viên CSKH");
        }

        User firstCS = csUsers.get(0);
        return UserResponse.builder()
                .id(firstCS.getId())
                .email(firstCS.getEmail())
                .fullName(firstCS.getFullName())
                .build();
    }

    private ChatMessageResponse toResponse(ChatMessage message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .message(message.getMessage())
                .senderId(message.getSender().getId())
                .senderName(
                        message.getSender().getFullName() != null
                                ? message.getSender().getFullName()
                                : message.getSender().getEmail())
                .senderEmail(message.getSender().getEmail())
                .receiverId(message.getReceiver().getId())
                .receiverName(
                        message.getReceiver().getFullName() != null
                                ? message.getReceiver().getFullName()
                                : message.getReceiver().getEmail())
                .receiverEmail(message.getReceiver().getEmail())
                .isRead(message.getIsRead())
                .createdAt(message.getCreatedAt())
                .readAt(message.getReadAt())
                .build();
    }
}


