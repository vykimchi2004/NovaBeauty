// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/nova_beauty';

// API Endpoints
export const API_ENDPOINTS = {
    // Auth
    AUTH: {
        SEND_OTP: '/auth/send-otp',
        VERIFY_OTP: '/auth/verify-otp',
        TOKEN: '/auth/token',
        REFRESH_TOKEN: '/auth/refresh',
        LOGOUT: '/auth/logout',
        RESET_PASSWORD: '/auth/reset-password',
        CHANGE_PASSWORD: '/auth/change-password',
    },
    // Users
    USERS: {
        CREATE: '/users',
        GET_ALL: '/users',
        GET_MY_INFO: '/users/my-info',
        GET_BY_ID: (id) => `/users/${id}`,
        UPDATE: (id) => `/users/${id}`,
        DELETE: (id) => `/users/${id}`,
        CREATE_STAFF: '/users/staff',
        ROLES: '/users/roles',
    },
    // Products
    PRODUCTS: {
        CREATE: '/products',
        LIST: '/products',
        PENDING: '/products/pending',
        ACTIVE: '/products/active',
        DETAIL: (id) => `/products/${id}`,
        SEARCH: '/products/search',
        BY_CATEGORY: (categoryId) => `/products/category/${categoryId}`,
        BY_PRICE_RANGE: '/products/price-range',
        MY_PRODUCTS: '/products/my-products',
        UPDATE: (id) => `/products/${id}`,
        DELETE: (id) => `/products/${id}`,
        APPROVAL: '/products/approve',
    },
    // Categories
    CATEGORIES: {
        CREATE: '/categories',
        LIST: '/categories',
        ROOT: '/categories/root',
        ACTIVE: '/categories/active',
        DETAIL: (id) => `/categories/${id}`,
        SUB_CATEGORIES: (parentId) => `/categories/${parentId}/subcategories`,
        UPDATE: (id) => `/categories/${id}`,
        DELETE: (id) => `/categories/${id}`,
    },
    // Banners
    BANNERS: {
        CREATE: '/banners',
        LIST: '/banners',
        ACTIVE: '/banners/active',
        DETAIL: (id) => `/banners/${id}`,
        UPDATE: (id) => `/banners/${id}`,
        UPDATE_ORDER: (id) => `/banners/${id}/order`,
        DELETE: (id) => `/banners/${id}`,
    },
    // Promotions
    PROMOTIONS: {
        CREATE: '/promotions',
        LIST: '/promotions',
        ACTIVE: '/promotions/active',
        PENDING: '/promotions/pending',
        BY_STATUS: (status) => `/promotions/status/${status}`,
        MY_PROMOTIONS: '/promotions/my-promotions',
        DETAIL: (id) => `/promotions/${id}`,
        UPDATE: (id) => `/promotions/${id}`,
        DELETE: (id) => `/promotions/${id}`,
        APPROVE: '/promotions/approve',
    },
    // Vouchers
    VOUCHERS: {
        CREATE: '/vouchers',
        LIST: '/vouchers',
        ACTIVE: '/vouchers/active',
        PENDING: '/vouchers/pending',
        BY_STATUS: (status) => `/vouchers/status/${status}`,
        MY_VOUCHERS: '/vouchers/my',
        DETAIL: (id) => `/vouchers/${id}`,
        UPDATE: (id) => `/vouchers/${id}`,
        DELETE: (id) => `/vouchers/${id}`,
        APPROVE: '/vouchers/approve',
    },
    // Reviews
    REVIEWS: {
        CREATE: '/reviews',
        LIST: '/reviews/all-reviews',
        MY_REVIEWS: '/reviews/my-reviews',
        BY_PRODUCT: (productId) => `/reviews/product/${productId}`,
        DETAIL: (id) => `/reviews/${id}`,
        REPLY: (id) => `/reviews/${id}/reply`,
        DELETE: (id) => `/reviews/${id}`,
    },
    // Media
    MEDIA: {
        UPLOAD_PRODUCT: '/media/upload-product',
        UPLOAD_PROFILE: '/media/upload',
    },
    // Cart
    CART: {
        GET: '/cart',
        ADD_ITEM: '/cart/items',
        APPLY_VOUCHER: '/cart/apply-voucher',
        CLEAR_VOUCHER: '/cart/voucher',
        REMOVE_ITEM: (itemId) => `/cart/items/${itemId}`,
        UPDATE_ITEM: (itemId) => `/cart/items/${itemId}`,
    },
    // Orders
    ORDERS: {
        CHECKOUT: '/orders/checkout',
        CHECKOUT_DIRECT: '/orders/checkout-direct',
        LIST: '/orders',
        DETAIL: (id) => `/orders/${id}`,
        CANCEL: (id) => `/orders/${id}/cancel`,
    },
    // Addresses
    ADDRESSES: {
        CREATE: '/addresses',
        MY_ADDRESSES: '/addresses',
        DETAIL: (id) => `/addresses/${id}`,
        UPDATE: (id) => `/addresses/${id}`,
        DELETE: (id) => `/addresses/${id}`,
    },
};

// Storage Keys
export const STORAGE_KEYS = {
    USER: 'user',
    TOKEN: 'token',
    CART: 'cart',
    THEME: 'theme',
};

// GHN Constants
export const GHN_DEFAULT_FROM_NAME = 'NovaBeauty Shop';
export const GHN_DEFAULT_FROM_PHONE = '0846120004';
export const GHN_DEFAULT_FROM_ADDRESS = '136 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội, Vietnam';
export const GHN_DEFAULT_FROM_WARD_CODE = '1A0602';
export const GHN_DEFAULT_FROM_DISTRICT_ID = 1485;
export const GHN_DEFAULT_FROM_PROVINCE_ID = 201;

// Service type
export const GHN_SERVICE_TYPE_LIGHT = 2; // < 20kg
export const GHN_SERVICE_TYPE_HEAVY = 5; // >= 20kg

// Weight threshold
export const GHN_HEAVY_SERVICE_WEIGHT_THRESHOLD = 20000; // 20kg in grams

