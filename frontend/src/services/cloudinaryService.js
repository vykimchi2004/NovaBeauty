import apiClient from './api';
import { API_ENDPOINTS } from './config';

/**
 * Get Cloudinary upload signature from backend
 * @param {string} folder - Target folder (product_media, voucher_media, etc.)
 * @returns {Promise<Object>} Signature data from backend
 */
export const getCloudinarySignature = async (folder) => {
  try {
    // Send folder as query parameter in URL
    const endpoint = `${API_ENDPOINTS.MEDIA.CLOUDINARY_SIGNATURE}?folder=${encodeURIComponent(folder)}`;
    const response = await apiClient.post(endpoint, {});
    return response;
  } catch (error) {
    console.error('[cloudinaryService] getCloudinarySignature error:', error);
    throw error;
  }
};

/**
 * Upload file directly to Cloudinary using signed upload
 * @param {File} file - File to upload
 * @param {string} folder - Target folder
 * @param {Function} onProgress - Progress callback (percent)
 * @returns {Promise<string>} Cloudinary secure URL
 */
export const uploadToCloudinary = async (file, folder, onProgress) => {
  try {
    // Step 1: Get signature from backend
    const signatureData = await getCloudinarySignature(folder);

    // Step 2: Prepare FormData for Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signature', signatureData.signature);
    formData.append('timestamp', signatureData.timestamp);
    formData.append('api_key', signatureData.api_key);
    formData.append('folder', signatureData.folder);

    // Step 3: Upload directly to Cloudinary using fetch with manual progress tracking
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/auto/upload`;

    // Use XMLHttpRequest for progress tracking (fetch doesn't support upload progress)
    const uploadPromise = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentCompleted = Math.round((e.loaded * 100) / e.total);
          onProgress(percentCompleted);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Failed to parse Cloudinary response'));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(errorResponse);
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', cloudinaryUrl);
      xhr.send(formData);
    });

    const response = await uploadPromise;
    return response.secure_url;
  } catch (error) {
    console.error('[cloudinaryService] uploadToCloudinary error:', error);
    
    // Handle specific Cloudinary errors
    if (error.error?.message) {
      const cloudinaryError = error.error;
      if (cloudinaryError.message?.includes('signature')) {
        throw new Error('Chữ ký upload đã hết hạn. Vui lòng thử lại.');
      }
      throw new Error(cloudinaryError.message || 'Lỗi upload lên Cloudinary');
    }
    
    throw new Error(error.message || 'Không thể upload file. Vui lòng thử lại.');
  }
};

/**
 * Upload multiple product media files
 * @param {File[]} files - Array of files to upload
 * @param {Function} onProgress - Progress callback (percent for all files)
 * @returns {Promise<string[]>} Array of Cloudinary URLs
 */
export const uploadProductMediaDirect = async (files, onProgress) => {
  if (!files || files.length === 0) {
    return [];
  }

  const totalFiles = files.length;
  const uploadedUrls = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Calculate overall progress
    const fileProgress = (percent) => {
      if (onProgress) {
        const overallProgress = Math.round(
          ((i / totalFiles) * 100) + ((percent / totalFiles))
        );
        onProgress(overallProgress);
      }
    };

    try {
      const url = await uploadToCloudinary(file, 'product_media', fileProgress);
      uploadedUrls.push(url);
    } catch (error) {
      console.error(`[cloudinaryService] Failed to upload file ${i + 1}:`, error);
      throw error;
    }
  }

  return uploadedUrls;
};

/**
 * Upload voucher media files
 * @param {File[]} files - Array of files to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string[]>} Array of Cloudinary URLs
 */
export const uploadVoucherMediaDirect = async (files, onProgress) => {
  if (!files || files.length === 0) {
    return [];
  }

  const urls = await Promise.all(
    files.map((file, index) => {
      const fileProgress = (percent) => {
        if (onProgress) {
          const overallProgress = Math.round(
            ((index + percent / 100) / files.length) * 100
          );
          onProgress(overallProgress);
        }
      };
      return uploadToCloudinary(file, 'voucher_media', fileProgress);
    })
  );

  return urls;
};

/**
 * Upload promotion media files
 * @param {File[]} files - Array of files to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string[]>} Array of Cloudinary URLs
 */
export const uploadPromotionMediaDirect = async (files, onProgress) => {
  if (!files || files.length === 0) {
    return [];
  }

  const urls = await Promise.all(
    files.map((file, index) => {
      const fileProgress = (percent) => {
        if (onProgress) {
          const overallProgress = Math.round(
            ((index + percent / 100) / files.length) * 100
          );
          onProgress(overallProgress);
        }
      };
      return uploadToCloudinary(file, 'promotion_media', fileProgress);
    })
  );

  return urls;
};

/**
 * Upload banner media files
 * @param {File[]} files - Array of files to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string[]>} Array of Cloudinary URLs
 */
export const uploadBannerMediaDirect = async (files, onProgress) => {
  if (!files || files.length === 0) {
    return [];
  }

  const urls = await Promise.all(
    files.map((file, index) => {
      const fileProgress = (percent) => {
        if (onProgress) {
          const overallProgress = Math.round(
            ((index + percent / 100) / files.length) * 100
          );
          onProgress(overallProgress);
        }
      };
      return uploadToCloudinary(file, 'banner_media', fileProgress);
    })
  );

  return urls;
};

/**
 * Upload profile media file
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<string>} Cloudinary URL
 */
export const uploadProfileMediaDirect = async (file, onProgress) => {
  return uploadToCloudinary(file, 'profile_media', onProgress);
};

export default {
  getCloudinarySignature,
  uploadToCloudinary,
  uploadProductMediaDirect,
  uploadVoucherMediaDirect,
  uploadPromotionMediaDirect,
  uploadBannerMediaDirect,
  uploadProfileMediaDirect,
};
