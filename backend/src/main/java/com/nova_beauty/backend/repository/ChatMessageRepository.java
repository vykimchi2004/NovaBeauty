package com.nova_beauty.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.nova_beauty.backend.entity.ChatMessage;
import com.nova_beauty.backend.entity.User;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    // Lấy tất cả tin nhắn giữa 2 user, sắp xếp theo thời gian
    @Query(
            "SELECT m FROM ChatMessage m WHERE "
                    + "(m.sender.id = :userId1 AND m.receiver.id = :userId2) OR "
                    + "(m.sender.id = :userId2 AND m.receiver.id = :userId1) "
                    + "ORDER BY m.createdAt ASC")
    List<ChatMessage> findConversationBetweenUsers(
            @Param("userId1") String userId1, @Param("userId2") String userId2);

    // Đếm số tin nhắn chưa đọc của một user
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.receiver.id = :userId AND m.isRead = false")
    Long countUnreadMessages(@Param("userId") String userId);

    // Lấy tất cả tin nhắn chưa đọc của một user
    List<ChatMessage> findByReceiverIdAndIsReadFalse(String receiverId);

    // Lấy danh sách user đã chat với một user (distinct)
    // Tìm tất cả receiver khi user là sender, và tất cả sender khi user là receiver
    @Query("SELECT DISTINCT m.receiver FROM ChatMessage m WHERE m.sender.id = :userId")
    List<User> findChatPartnersAsSender(@Param("userId") String userId);

    @Query("SELECT DISTINCT m.sender FROM ChatMessage m WHERE m.receiver.id = :userId")
    List<User> findChatPartnersAsReceiver(@Param("userId") String userId);

    // Lấy tin nhắn cuối cùng giữa 2 user
    @Query(
            value =
                    "SELECT * FROM chat_messages WHERE "
                            + "(sender_id = :userId1 AND receiver_id = :userId2) OR "
                            + "(sender_id = :userId2 AND receiver_id = :userId1) "
                            + "ORDER BY created_at DESC LIMIT 1",
            nativeQuery = true)
    ChatMessage findLastMessageBetweenUsers(
            @Param("userId1") String userId1, @Param("userId2") String userId2);
}


