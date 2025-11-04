// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

// API Endpoints
export const API_ENDPOINTS = {
    // Auth
    AUTH: {
        SEND_CODE: '/api/auth/send-code',
        VERIFY_CODE: '/api/auth/verify-code',
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        REFRESH_TOKEN: '/api/auth/refresh',
    },
    // Products
    PRODUCTS: {
        LIST: '/api/products',
        DETAIL: (id) => `/api/products/${id}`,
        SEARCH: '/api/products/search',
        BY_CATEGORY: (category) => `/api/products/category/${category}`,
    },
    // Categories
    CATEGORIES: {
        LIST: '/api/categories',
        DETAIL: (id) => `/api/categories/${id}`,
    },
    // Cart
    CART: {
        GET: '/api/cart',
        ADD: '/api/cart/add',
        UPDATE: '/api/cart/update',
        REMOVE: '/api/cart/remove',
        CLEAR: '/api/cart/clear',
    },
    // Orders
    ORDERS: {
        LIST: '/api/orders',
        CREATE: '/api/orders',
        DETAIL: (id) => `/api/orders/${id}`,
        CANCEL: (id) => `/api/orders/${id}/cancel`,
    },
};

// Storage Keys
export const STORAGE_KEYS = {
    USER: 'user',
    TOKEN: 'token',
    CART: 'cart',
    THEME: 'theme',
};

