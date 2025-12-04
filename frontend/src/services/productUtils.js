// Product related helpers

/**
 * Normalize a media URL so it can be used directly by the browser.
 * - Keeps absolute URLs untouched.
 * - For `/path` style, prefix with apiBaseUrl.
 * - Otherwise assume the value is a relative media filename.
 */
export const normalizeMediaUrl = (url, apiBaseUrl = '') => {
    if (!url) return '';

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    if (url.startsWith('/')) {
        return `${apiBaseUrl}${url}`;
    }

    const normalizedBase = apiBaseUrl.replace(/\/$/, '');
    return `${normalizedBase}/product_media/${url}`;
};

export default {
    normalizeMediaUrl,
};


