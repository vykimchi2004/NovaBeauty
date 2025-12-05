import { useState, useEffect, useCallback } from 'react';
import {
  getCategories,
  getActiveCategories,
  getRootCategories,
  getSubCategories,
} from '~/services/category';

/**
 * Custom hook để quản lý categories
 * @param {Object} options - Options
 * @param {string} options.type - Loại categories: 'all' | 'active' | 'root' (default: 'active')
 * @param {boolean} options.autoLoad - Tự động load khi mount (default: true)
 * @param {boolean} options.filterInactive - Lọc bỏ categories không active (default: true)
 * @returns {Object} Categories state và methods
 */
export const useCategories = ({
  type = 'active',
  autoLoad = true,
  filterInactive = true,
} = {}) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let data = [];
      if (type === 'all') {
        data = await getCategories();
      } else if (type === 'root') {
        data = await getRootCategories();
      } else {
        // 'active'
        data = await getActiveCategories();
      }

      // Filter inactive nếu cần
      const filtered = filterInactive
        ? (data || []).filter((cat) => cat.status !== false)
        : data || [];

      setCategories(filtered);
    } catch (err) {
      console.error('[useCategories] Error loading categories:', err);
      setError(err.message || 'Không thể tải danh sách danh mục');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [type, filterInactive]);

  // Load subcategories cho một category cụ thể
  const loadSubCategories = useCallback(async (parentId) => {
    if (!parentId) return [];

    try {
      const data = await getSubCategories(parentId);
      return filterInactive
        ? (data || []).filter((cat) => cat.status !== false)
        : data || [];
    } catch (err) {
      console.error('[useCategories] Error loading subcategories:', err);
      return [];
    }
  }, [filterInactive]);

  // Auto load khi mount
  useEffect(() => {
    if (autoLoad) {
      loadCategories();
    }
  }, [autoLoad, loadCategories]);

  // Lắng nghe event categories-updated (nếu có)
  useEffect(() => {
    const handleCategoriesUpdated = () => {
      loadCategories();
    };

    window.addEventListener('categories-updated', handleCategoriesUpdated);
    window.addEventListener('categoriesUpdated', handleCategoriesUpdated); // Support cả 2 format

    return () => {
      window.removeEventListener('categories-updated', handleCategoriesUpdated);
      window.removeEventListener('categoriesUpdated', handleCategoriesUpdated);
    };
  }, [loadCategories]);

  return {
    categories,
    setCategories,
    loading,
    error,
    loadCategories,
    loadSubCategories,
    refetch: loadCategories,
  };
};

