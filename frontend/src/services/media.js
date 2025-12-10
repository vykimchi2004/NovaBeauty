import apiClient from './api';
import { API_ENDPOINTS } from './config';

const buildFormData = (files = [], prefix = 'upload') => {
    const formData = new FormData();

    files.forEach((file, index) => {
        if (file) {
            const name = file.name || `${prefix}-${Date.now()}-${index}`;
            formData.append('files', file, name);
        }
    });

    return formData;
};

const uploadMedia = async (files = [], endpoint, prefix) => {
    if (!files || files.length === 0) {
        return [];
    }

    const formData = buildFormData(files, prefix);

    try {
        return await apiClient.post(endpoint, formData);
    } catch (error) {
        console.error(`[Media Service] uploadMedia error (${endpoint}):`, error);
        throw error;
    }
};

export const uploadProfileMedia = (files = []) =>
    uploadMedia(files, API_ENDPOINTS.MEDIA.UPLOAD_PROFILE, 'profile-upload');

export const uploadProductMedia = (files = []) =>
    uploadMedia(files, API_ENDPOINTS.MEDIA.UPLOAD_PRODUCT, 'product-upload');

export const uploadVoucherMedia = (files = []) =>
    uploadMedia(files, API_ENDPOINTS.MEDIA.UPLOAD_VOUCHER, 'voucher-upload');

export const uploadPromotionMedia = (files = []) =>
    uploadMedia(files, API_ENDPOINTS.MEDIA.UPLOAD_PROMOTION, 'promotion-upload');

export const uploadBannerMedia = (files = []) =>
    uploadMedia(files, API_ENDPOINTS.MEDIA.UPLOAD_BANNER, 'banner-upload');

export default {
    uploadProfileMedia,
    uploadProductMedia,
    uploadVoucherMedia,
    uploadPromotionMedia,
    uploadBannerMedia,
};
