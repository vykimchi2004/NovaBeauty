import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';

// Local storage keys
const USED_VOUCHERS_KEY = 'used_vouchers_by_user';
const PENDING_VOUCHER_KEY = 'pending_voucher_usage';

const normalizeCode = (code) => (code || '').toString().trim().toUpperCase();
const normalizeUserId = (user) => {
  if (!user) return null;
  return user.id || user.userId || user._id || null;
};

const loadUsedMap = () => storage.get(USED_VOUCHERS_KEY, {});
const saveUsedMap = (map) => storage.set(USED_VOUCHERS_KEY, map);

export const hasUsedVoucher = (userId, code) => {
  const normalizedCode = normalizeCode(code);
  if (!userId || !normalizedCode) return false;
  const usedMap = loadUsedMap();
  const userCodes = usedMap[userId];
  if (!userCodes) return false;
  return Boolean(userCodes[normalizedCode]);
};

export const markVoucherUsed = (userId, code) => {
  const normalizedCode = normalizeCode(code);
  if (!userId || !normalizedCode) return;
  const usedMap = loadUsedMap();
  const userCodes = usedMap[userId] || {};
  userCodes[normalizedCode] = true;
  usedMap[userId] = userCodes;
  saveUsedMap(usedMap);
};

export const setPendingVoucher = (userId, code) => {
  const normalizedCode = normalizeCode(code);
  if (!userId || !normalizedCode) return;
  const payload = { userId, code: normalizedCode, createdAt: Date.now() };
  storage.set(PENDING_VOUCHER_KEY, payload);
};

export const consumePendingVoucher = (userId) => {
  const pending = storage.get(PENDING_VOUCHER_KEY, null);
  if (!pending || pending.userId !== userId) {
    return null;
  }
  storage.remove(PENDING_VOUCHER_KEY);
  return normalizeCode(pending.code);
};

// Helper to read current userId from storage
export const getStoredUserId = () => {
  const user = storage.get(STORAGE_KEYS.USER, null);
  return normalizeUserId(user);
};

