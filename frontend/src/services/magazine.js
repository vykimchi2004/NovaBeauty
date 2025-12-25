import apiClient from './api';
import { API_ENDPOINTS } from './config';

export async function getMagazines() {
  try {
    return await apiClient.get('/magazines');
  } catch (error) {
    console.error('[Magazine Service] getMagazines error:', error);
    throw error;
  }
}

export async function getActiveMagazines() {
  try {
    return await apiClient.get('/magazines/active');
  } catch (error) {
    console.error('[Magazine Service] getActiveMagazines error:', error);
    throw error;
  }
}

export async function createMagazine(payload) {
  try {
    return await apiClient.post('/magazines', payload);
  } catch (error) {
    console.error('[Magazine Service] createMagazine error:', error);
    throw error;
  }
}

export default { getMagazines, getActiveMagazines, createMagazine };
