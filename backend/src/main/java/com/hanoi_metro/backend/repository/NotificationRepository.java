package com.hanoi_metro.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hanoi_metro.backend.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, String> {

    // Tìm tất cả notifications của một user, sắp xếp theo thời gian mới nhất
    @Query("SELECT n FROM Notification n JOIN n.users u WHERE u.id = :userId ORDER BY n.createdAt DESC")
    List<Notification> findByUsersIdOrderByCreatedAtDesc(@Param("userId") String userId);

    // Đếm số lượng notifications chưa đọc của user
    @Query("SELECT COUNT(n) FROM Notification n JOIN n.users u WHERE u.id = :userId AND n.isRead = false")
    Long countByUsersIdAndIsReadFalse(@Param("userId") String userId);
}
