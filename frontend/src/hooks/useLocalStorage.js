import { useState, useCallback } from 'react';

function readValue(key, initialValue) {
    if (typeof window === 'undefined') {
        return initialValue;
    }

    try {
        const item = window.localStorage.getItem(key);
        if (item === null || item === undefined) {
            return initialValue;
        }
        return JSON.parse(item);
    } catch (_) {
        return initialValue;
    }
}

export default function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => readValue(key, initialValue));

    const setValue = useCallback(
        (value) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
            } catch (_) {
                // ignore
            }
        },
        [key, storedValue],
    );

    const removeValue = useCallback(() => {
        try {
            setStoredValue(initialValue);
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
        } catch (_) {
            // ignore
        }
    }, [initialValue, key]);

    return [storedValue, setValue, removeValue];
}


