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

// GHN location helpers
const extractResult = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.result || payload.data || [];
};

const fetchJson = async (url, options) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `Request failed with status ${res.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch (e) {
        // Nếu không parse được JSON, dùng errorText
        if (errorText) errorMessage = errorText;
      }
      const error = new Error(errorMessage);
      error.status = res.status;
      error.statusText = res.statusText;
      throw error;
    }
    return res.json();
  } catch (error) {
    // Nếu là lỗi network (không kết nối được server)
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      const networkError = new Error('Không thể kết nối đến server. Vui lòng kiểm tra backend đã chạy chưa.');
      networkError.status = 0;
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw error;
  }
};

export async function getProvinces() {
  const data = await fetchJson(`${API_BASE_URL}/shipments/ghn/provinces`);
  return extractResult(data);
}

export async function getDistricts(provinceId) {
  const data = await fetchJson(`${API_BASE_URL}/shipments/ghn/districts?province_id=${provinceId}`);
  return extractResult(data);
}

export async function getWards(districtId) {
  const data = await fetchJson(`${API_BASE_URL}/shipments/ghn/wards?district_id=${districtId}`);
  return extractResult(data);
}

// Tính phí vận chuyển GHN dựa trên địa chỉ & trọng lượng ước tính
export async function calculateShippingFee(payload) {
  const data = await fetchJson(`${API_BASE_URL}/shipments/ghn/fees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  // Backend bọc kết quả trong ApiResponse { result: ... } hoặc { data: ... }
  return data.result || data.data || {};
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

