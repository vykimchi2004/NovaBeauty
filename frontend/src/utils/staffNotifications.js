import { storage } from '~/services/utils';

const NOTIFICATION_KEY = 'STAFF_NOTIFICATIONS';
const STATUS_CACHE_KEY = 'STAFF_STATUS_CACHE';
export const STAFF_NOTIFICATION_EVENT = 'staffNotificationsUpdated';

const buildNotificationKey = (userId) => `${NOTIFICATION_KEY}_${userId}`;
const buildStatusCacheKey = (categoryKey, userId) => `${STATUS_CACHE_KEY}_${categoryKey}_${userId}`;

const dispatchNotificationUpdate = (notifications) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STAFF_NOTIFICATION_EVENT, { detail: notifications }));
  }
};

export const loadStaffNotifications = (userId) => {
  if (!userId) return [];
  return storage.get(buildNotificationKey(userId), []) || [];
};

export const addStaffNotification = (userId, notification) => {
  if (!userId || !notification) return null;
  const key = buildNotificationKey(userId);
  const existing = storage.get(key, []) || [];
  const enriched = {
    id: notification.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: notification.createdAt || new Date().toISOString(),
    read: false,
    ...notification,
  };
  const updated = [enriched, ...existing].slice(0, 50);
  storage.set(key, updated);
  dispatchNotificationUpdate(updated);
  return enriched;
};

export const markAllStaffNotificationsAsRead = (userId) => {
  if (!userId) return [];
  const key = buildNotificationKey(userId);
  const notifications = storage.get(key, []) || [];
  const updated = notifications.map((item) => ({ ...item, read: true }));
  storage.set(key, updated);
  dispatchNotificationUpdate(updated);
  return updated;
};

export const removeStaffNotification = (userId, notificationId) => {
  if (!userId) return [];
  const key = buildNotificationKey(userId);
  const notifications = storage.get(key, []) || [];
  const updated = notifications.filter((item) => item.id !== notificationId);
  storage.set(key, updated);
  dispatchNotificationUpdate(updated);
  return updated;
};

export const markStaffNotificationAsRead = (userId, notificationId) => {
  if (!userId || !notificationId) return [];
  const key = buildNotificationKey(userId);
  const notifications = storage.get(key, []) || [];
  const updated = notifications.map((item) =>
    item.id === notificationId ? { ...item, read: true } : item
  );
  storage.set(key, updated);
  dispatchNotificationUpdate(updated);
  return updated;
};

export const clearStaffNotifications = (userId) => {
  if (!userId) return;
  const key = buildNotificationKey(userId);
  storage.set(key, []);
  dispatchNotificationUpdate([]);
};

export const detectStatusNotifications = ({
  categoryKey,
  userId,
  items = [],
  getItemId = (item) => item?.id,
  getStatus = (item) => item?.status,
  buildNotification,
}) => {
  if (!userId || !categoryKey || !Array.isArray(items)) return [];
  const cacheKey = buildStatusCacheKey(categoryKey, userId);
  const previous = storage.get(cacheKey, {}) || {};
  const nextCache = {};
  const notifications = [];

  items.forEach((item) => {
    const itemId = getItemId(item);
    const status = getStatus(item);
    if (!itemId || !status) return;

    nextCache[itemId] = status;
    const prevStatus = previous[itemId];

    if (prevStatus && prevStatus !== status) {
      const notifPayload = buildNotification ? buildNotification(item, status, prevStatus) : null;
      if (notifPayload) {
        notifications.push(notifPayload);
      }
    }
  });

  storage.set(cacheKey, nextCache);
  return notifications;
};

export const detectDeletionNotifications = ({
  categoryKey,
  userId,
  items = [],
  getItemId = (item) => item?.id,
  getItemName = (item) => item?.name,
  buildNotification,
}) => {
  if (!userId || !categoryKey || !Array.isArray(items) || !buildNotification) return [];

  const cacheKey = buildStatusCacheKey(`DELETED_${categoryKey}`, userId);
  const previous = storage.get(cacheKey, {}) || {};
  const nextCache = {};
  const notifications = [];

  items.forEach((item) => {
    const itemId = getItemId(item);
    if (!itemId) return;
    const name = getItemName(item);
    nextCache[itemId] = { name };
  });

  // Detect deletions: những id có trong previous nhưng không còn trong nextCache
  Object.keys(previous).forEach((itemId) => {
    if (!nextCache[itemId]) {
      const prevEntry = previous[itemId];
      const name = typeof prevEntry === 'string' ? prevEntry : prevEntry?.name;
      const notifPayload = buildNotification({ id: itemId, name });
      if (notifPayload) {
        notifications.push(notifPayload);
      }
    }
  });

  storage.set(cacheKey, nextCache);
  return notifications;
};


