import { API_BASE_URL, STORAGE_KEYS } from './config';

// Utils
// Hàm tiện ích

// Format currency
export const formatCurrency = (amount, currency = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

// Format date
export const formatDate = (date, options = {}) => {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };

    return new Intl.DateTimeFormat('vi-VN', {
        ...defaultOptions,
        ...options,
    }).format(new Date(date));
};

// Format date time
export function formatDateTime(value) {
    try {
        const d = new Date(value);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
    } catch (_) {
        return value;
    }
}

// Validate email
export const isValidEmail = (email) => {
    // Kiểm tra dấu chấm liên tiếp trước
    if (email.includes('..')) {
        return false;
    }
    
    // Kiểm tra dấu chấm ở đầu hoặc cuối tên email
    const [localPart, domainPart] = email.split('@');
    if (!localPart || !domainPart) {
        return false;
    }
    
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
        return false;
    }
    
    if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
        return false;
    }
    
    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRe.test(email);
};

// Validate password
export const validatePassword = (password, confirmPassword = null) => {
    // Kiểm tra độ dài
    if (password.length < 8) {
        return { isValid: false, error: 'Mật khẩu quá ngắn, tối thiểu 8 ký tự' };
    }
    if (password.length > 32) {
        return { isValid: false, error: 'Mật khẩu quá dài, tối đa 32 ký tự' };
    }
    
    // Kiểm tra khoảng trắng
    const hasAnyWhitespace = /[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF\u200B\u200C\u200D]/.test(password);
    if (hasAnyWhitespace) {
        return { isValid: false, error: 'Mật khẩu không được chứa khoảng trắng.' };
    }
    
    // Kiểm tra confirm password nếu có
    if (confirmPassword !== null && password !== confirmPassword) {
        return { isValid: false, error: 'Mật khẩu không khớp' };
    }
    
    // Kiểm tra các yêu cầu về ký tự
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    if (!(hasLowercase && hasUppercase && hasDigit && hasSpecial)) {
        return { isValid: false, error: 'Mật khẩu ít nhất phải chứa một chữ cái thường, 1 chữ cái in hoa, 1 số và 1 kí tự đặc biệt' };
    }
    
    return { isValid: true, error: null };
};

// Calculate discount percentage
export const calculateDiscount = (originalPrice, currentPrice) => {
    if (originalPrice <= currentPrice) return 0;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
};

// Local storage helpers
export const storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error getting from localStorage:', error);
            return defaultValue;
        }
    },

    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error setting to localStorage:', error);
            return false;
        }
    },

    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },
};

// Mask email for privacy
export const maskEmail = (email) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    const visible = name.slice(0, 2);
    const stars = '*'.repeat(Math.max(0, name.length - 2));
    return `${visible}${stars}@${domain}`;
};

// Safely extract message from response
export const safeMessage = async (response) => {
    try {
        const data = await response.json();
        return data?.message;
    } catch (_) {
        return undefined;
    }
};

// Debounce function
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Throttle function
export const throttle = (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

// Truncate text
export const truncateText = (text, maxLength = 100, suffix = '...') => {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
};

// Expose API base url (env override or fallback)
export const getApiBaseUrl = () => {
    if (typeof process !== 'undefined' && process?.env?.REACT_APP_API_BASE_URL) {
        const envUrl = String(process.env.REACT_APP_API_BASE_URL).trim();
        if (envUrl) {
            return envUrl;
        }
    }
    return API_BASE_URL;
};

// Safely read token from storage (session first, then local)
export const getStoredToken = (key = STORAGE_KEYS.TOKEN) => {
    const normalize = (value) => {
        if (!value) return null;
        let token = String(value).trim();

        if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
            token = token.slice(1, -1);
        }

        if (token.startsWith('{') || token.startsWith('[')) {
            try {
                const parsed = JSON.parse(token);
                if (typeof parsed === 'string') {
                    token = parsed;
                } else if (parsed && typeof parsed.token === 'string') {
                    token = parsed.token;
                }
            } catch (_) {
                // ignore parse errors, fallback to raw string
            }
        }

        if (token.toLowerCase().startsWith('bearer ')) {
            token = token.slice(7);
        }

        return token.trim() || null;
    };

    try {
        const fromSession = normalize(sessionStorage.getItem(key));
        if (fromSession) return fromSession;
    } catch (_) {
        // ignore sessionStorage access errors
    }

    try {
        const fromLocal = normalize(localStorage.getItem(key));
        if (fromLocal) return fromLocal;
    } catch (_) {
        // ignore localStorage access errors
    }

    return null;
};

// Format number with thousand separators
export const formatNumber = (number, locale = 'vi-VN') => {
    return new Intl.NumberFormat(locale).format(number);
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
    }
};

// Generate unique ID
export const generateId = (prefix = '') => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 9);
    return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
};

// Scroll to top
export const scrollToTop = (behavior = 'smooth') => {
    if (typeof window !== 'undefined') {
        try {
            window.scrollTo({ top: 0, left: 0, behavior });
        } catch (_) {
            window.scrollTo(0, 0);
        }
    }
};

