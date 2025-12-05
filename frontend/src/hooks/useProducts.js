import { useState, useEffect, useCallback } from 'react';
import { getActiveProducts, getProductsByCategory } from '~/services/product';

/**
 * Custom hook để quản lý products
 * @param {Object} options - Options
 * @param {string} options.categoryId - ID category để filter (optional)
 * @param {boolean} options.autoLoad - Tự động load khi mount (default: true)
 * @returns {Object} Products state và methods
 */
export const useProducts = ({ categoryId = null, autoLoad = true } = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let data = [];
      if (categoryId) {
        data = await getProductsByCategory(categoryId);
      } else {
        data = await getActiveProducts();
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[useProducts] Error loading products:', err);
      setError(err.message || 'Không thể tải danh sách sản phẩm');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  // Auto load khi mount hoặc categoryId thay đổi
  useEffect(() => {
    if (autoLoad) {
      loadProducts();
    }
  }, [autoLoad, loadProducts]);

  return {
    products,
    setProducts,
    loading,
    error,
    loadProducts,
    refetch: loadProducts,
  };
};

