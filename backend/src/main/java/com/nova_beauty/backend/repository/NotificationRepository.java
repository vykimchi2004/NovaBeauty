package com.nova_beauty.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nova_beauty.backend.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, String> {}

