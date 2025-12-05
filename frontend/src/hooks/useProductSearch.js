import { useState, useEffect, useRef, useCallback } from 'react';
import { searchProducts } from '~/services/product';

/**
 * Custom hook for product search functionality
 * Handles search query, debouncing, and results management
 */
export function useProductSearch() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchTimeoutRef = useRef(null);

    // Debounced search effect
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!searchQuery.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const results = await searchProducts(searchQuery.trim(), { limit: 10 });
                const products = Array.isArray(results) ? results : (results?.result || []);
                setSearchResults(products);
                setShowSearchResults(products.length > 0);
            } catch (error) {
                console.error('Error searching products:', error);
                setSearchResults([]);
                setShowSearchResults(false);
            } finally {
                setIsSearching(false);
            }
        }, 300); // Debounce 300ms

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    const handleSearchChange = useCallback((value) => {
        setSearchQuery(value);
    }, []);

    // Use a ref to track results for focus handler
    const searchResultsRef = useRef([]);
    useEffect(() => {
        searchResultsRef.current = searchResults;
    }, [searchResults]);

    const handleSearchFocus = useCallback(() => {
        if (searchResultsRef.current.length > 0) {
            setShowSearchResults(true);
        }
    }, []);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setShowSearchResults(false);
        setSearchResults([]);
    }, []);

    const hideSearchResults = useCallback(() => {
        setShowSearchResults(false);
    }, []);

    return {
        searchQuery,
        searchResults,
        isSearching,
        showSearchResults,
        handleSearchChange,
        handleSearchFocus,
        clearSearch,
        hideSearchResults,
    };
}

