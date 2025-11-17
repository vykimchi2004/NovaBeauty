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
        ACTIVE: '/products/active',
        DETAIL: (id) => `/products/${id}`,
        SEARCH: '/products/search',
        BY_CATEGORY: (categoryId) => `/products/category/${categoryId}`,
        BY_PRICE_RANGE: '/products/price-range',
        MY_PRODUCTS: '/products/my-products',
        UPDATE: (id) => `/products/${id}`,
        DELETE: (id) => `/products/${id}`,
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
    },
    // Cart
    CART: {
        GET: '/cart',
        ADD_ITEM: '/cart/items',
        APPLY_VOUCHER: '/cart/apply-voucher',
    },
    // Orders (placeholder - chưa có backend)
    ORDERS: {
        LIST: '/orders',
        CREATE: '/orders',
        DETAIL: (id) => `/orders/${id}`,
        CANCEL: (id) => `/orders/${id}/cancel`,
    },
};

// Storage Keys
export const STORAGE_KEYS = {
    USER: 'user',
    TOKEN: 'token',
    CART: 'cart',
    THEME: 'theme',
};

