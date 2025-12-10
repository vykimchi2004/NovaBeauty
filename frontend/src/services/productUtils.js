// Product related helpers

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

const legacyPathReplacements = [
    { from: '/vouchers/', to: '/voucher_media/' },
    { from: '/promotions/', to: '/promotion_media/' },
    { from: '/promotions_media/', to: '/promotion_media/' },
    { from: '/banner_media/', to: '/banners/' },
    { from: '/banners/', to: '/banners/' },
    { from: '/uploads/', to: '/product_media/' },
];

const normalizePath = (path, folder) => {
    if (!path) return '';

    let normalized = String(path).replace(/\\/g, '/').trim();
    legacyPathReplacements.forEach(({ from, to }) => {
        normalized = normalized.replace(from, to);
    });

    if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`;
    }

    const hasFolder = normalized.includes(`/${folder}/`);
    if (!hasFolder) {
        const trimmed = normalized.replace(/^\/+/, '');
        normalized = `/${folder}/${trimmed}`;
    }

    return normalized.replace(/\/{2,}/g, '/');
};

/**
 * Normalize a media URL so it can be used directly by the browser.
 * - Keeps Cloudinary URLs untouched.
 * - Converts legacy absolute URLs to the new folder structure.
 * - For `/path` style, prefix with apiBaseUrl.
 * - Otherwise assume the value is a relative media filename inside the target folder.
 */
export const normalizeMediaUrl = (url, apiBaseUrl = '', folder = 'product_media') => {
    if (!url) return '';

    if (ABSOLUTE_URL_REGEX.test(url)) {
        // Cloudinary links can be used directly
        if (url.includes('cloudinary.com')) {
            return url;
        }

        try {
            const parsed = new URL(url);
            const normalizedPath = normalizePath(parsed.pathname, folder);
            return `${parsed.origin}${normalizedPath}`;
        } catch {
            // If URL parsing fails, fall back to returning original URL
            return url;
        }
    }

    const normalizedBase = (apiBaseUrl || '').replace(/\/$/, '');
    const normalizedPath = normalizePath(url, folder);
    return `${normalizedBase}${normalizedPath}`;
};

export const normalizeVoucherImageUrl = (url, apiBaseUrl = '') =>
    normalizeMediaUrl(url, apiBaseUrl, 'voucher_media');

export const normalizePromotionImageUrl = (url, apiBaseUrl = '') =>
    normalizeMediaUrl(url, apiBaseUrl, 'promotion_media');

export const normalizeBannerImageUrl = (url, apiBaseUrl = '') =>
    normalizeMediaUrl(url, apiBaseUrl, 'banners');

export default {
    normalizeMediaUrl,
    normalizeVoucherImageUrl,
    normalizePromotionImageUrl,
    normalizeBannerImageUrl,
};


