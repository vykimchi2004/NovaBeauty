import apiClient from './api';
import { API_BASE_URL } from './config';

export async function getMyAddresses() {
  return apiClient.get('/addresses');
}

export async function createAddress(address) {
  return apiClient.post('/addresses', address);
}

// GHN location helpers
export async function getProvinces() {
  const res = await fetch(`${API_BASE_URL}/ghn/provinces`);
  const data = await res.json();
  return data.result || [];
}

export async function getDistricts(provinceId) {
  const res = await fetch(`${API_BASE_URL}/ghn/districts?province_id=${provinceId}`);
  const data = await res.json();
  return data.result || [];
}

export async function getWards(districtId) {
  const res = await fetch(`${API_BASE_URL}/ghn/wards?district_id=${districtId}`);
  const data = await res.json();
  return data.result || [];
}



