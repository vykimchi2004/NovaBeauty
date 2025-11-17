import apiClient from './api';
import { API_ENDPOINTS } from './config';

export async function uploadProductMedia(files = []) {
    if (!files || files.length === 0) {
        return [];
    }

    const formData = new FormData();
    files.forEach((file, index) => {
        if (file) {
            const name = file.name || `upload-${Date.now()}-${index}`;
            formData.append('files', file, name);
        }
    });

    try {
        return await apiClient.post(API_ENDPOINTS.MEDIA.UPLOAD_PRODUCT, formData);
    } catch (error) {
        console.error('[Media Service] uploadProductMedia error:', error);
        throw error;
    }
}


