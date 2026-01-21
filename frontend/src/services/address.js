import apiClient from './api';
import { API_BASE_URL } from './config';

export async function getMyAddresses() {
  return apiClient.get('/addresses');
}

export async function createAddress(address) {
  return apiClient.post('/addresses', address);
}

export async function updateAddress(addressId, address) {
  return apiClient.put(`/addresses/${addressId}`, address);
}

export async function deleteAddress(addressId) {
  return apiClient.delete(`/addresses/${addressId}`);
}

export async function setDefaultAddress(addressId) {
  return apiClient.put(`/addresses/${addressId}/set-default`);
}

// GHN location helpers removed

export async function getProvinces() {
  return [];
}

export async function getDistricts(provinceId) {
  return [];
}

export async function getWards(districtId) {
  return [];
}

// Tính phí vận chuyển (đã xóa GHN, trả về 0)
export async function calculateShippingFee(payload) {
  return { total: 0 };
}

// Format địa chỉ đầy đủ từ các field
export function formatFullAddress(address) {
  if (!address) return '';
  const segments = [
    address.address,
    address.wardName,
    address.districtName,
    address.provinceName,
  ]
    .map((part) => (part || '').trim())
    .filter(Boolean);
  return segments.join(', ');
}

