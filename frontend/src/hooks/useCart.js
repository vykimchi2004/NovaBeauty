import { useState, useEffect, useCallback, useRef } from 'react';
import cartService from '~/services/cart';
import { getProductById } from '~/services/product';
import { normalizeVariantRecords } from '~/utils/productVariants';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
// Không cần kiểm tra localStorage nữa - backend đã xử lý
import notify from '~/utils/notification';

/**
 * Custom hook để quản lý giỏ hàng
 * @param {Object} options - Options
 * @param {boolean} options.autoLoad - Tự động load cart khi mount (default: true)
 * @param {boolean} options.listenToEvents - Lắng nghe cartUpdated event (default: true)
 * @returns {Object} Cart state và methods
 */
export const useCart = ({ autoLoad = true, listenToEvents = true } = {}) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState(null);
  
  // Use ref để lưu cartItems hiện tại mà không cần dependency
  const cartItemsRef = useRef(cartItems);
  
  // Cập nhật ref mỗi khi cartItems thay đổi
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  // Map dữ liệu cart item từ API + gắn maxQuantity theo tồn kho
  const buildCartItemsWithStock = useCallback(async (apiItems, existingItems = []) => {
    const rawItems = apiItems || [];
    if (!rawItems.length) return [];

    const uniqueProductIds = Array.from(
      new Set(rawItems.map((it) => it.productId).filter(Boolean)),
    );

    const productMap = {};
    if (uniqueProductIds.length) {
      await Promise.all(
        uniqueProductIds.map(async (pid) => {
          try {
            const productData = await getProductById(pid);
            if (productData) {
              productMap[pid] = productData;
            }
          } catch (err) {
            console.error('[useCart] Failed to load product for stock check:', pid, err);
          }
        }),
      );
    }

    return rawItems.map((item) => {
      const existing = existingItems.find(
        (i) =>
          i.productId === item.productId &&
          (i.colorCode || null) === (item.colorCode || null),
      );

      let maxQuantity = null;
      const product = productMap[item.productId];
      if (product) {
        if (item.colorCode) {
          // Sản phẩm có mã màu: lấy tồn kho từ variant tương ứng
          const variants = normalizeVariantRecords(product.manufacturingLocation);
          const code = (item.colorCode || '').trim();
          const matchedVariant =
            variants.find(
              (v) =>
                (v.code || v.name || '').toString().trim().toLowerCase() === code.toLowerCase(),
            ) || null;
          if (
            matchedVariant &&
            typeof matchedVariant.stockQuantity === 'number' &&
            !Number.isNaN(matchedVariant.stockQuantity)
          ) {
            maxQuantity = matchedVariant.stockQuantity;
          }
        } else {
          // Sản phẩm không có mã màu: lấy tồn kho từ product.stockQuantity
          if (
            product.stockQuantity !== null &&
            product.stockQuantity !== undefined &&
            typeof product.stockQuantity === 'number' &&
            !Number.isNaN(product.stockQuantity)
          ) {
            maxQuantity = product.stockQuantity;
          }
        }
      }

      return {
        id: item.id,
        productId: item.productId,
        name: item.productName,
        currentPrice: item.unitPrice,
        originalPrice: item.unitPrice,
        quantity: item.quantity,
        selected: existing ? existing.selected : false,
        finalPrice: item.finalPrice,
        colorCode: item.colorCode || null,
        maxQuantity,
      };
    });
  }, []);

  // Load cart từ API
  const loadCart = useCallback(
    async (skipEventDispatch = false, skipLoading = false) => {
      try {
        if (!skipLoading) {
          setLoading(true);
        }
        setIsUnauthenticated(false);

        // Kiểm tra token trước khi gọi API
        const token = storage.get(STORAGE_KEYS.TOKEN);
        if (!token) {
          setIsUnauthenticated(true);
          setCartItems([]);
          setSubtotal(0);
          setTotal(0);
          setAppliedDiscount(0);
          setAppliedVoucherCode(null);
          return;
        }

        const cartData = await cartService.getCart();

        // Map dữ liệu từ API sang format hiển thị, giữ nguyên trạng thái chọn hiện tại nếu có
        // Sử dụng ref để lấy cartItems hiện tại mà không cần dependency
        const currentItems = cartItemsRef.current;
        const items = await buildCartItemsWithStock(cartData.items || [], currentItems);

        setCartItems(items);
        setSubtotal(cartData.subtotal || 0);
        setAppliedDiscount(cartData.voucherDiscount || 0);
        setAppliedVoucherCode(cartData.appliedVoucherCode);
        setTotal(cartData.totalAmount || 0);
        setIsUnauthenticated(false);

        // Nếu không có sản phẩm nào được chọn mà lại có voucher đang được áp dụng,
        // thì tự động xóa voucher đó
        const hasSelectedItems = items.some((item) => item.selected);
        if (!hasSelectedItems && cartData.appliedVoucherCode) {
          try {
            await cartService.clearVoucher();
            setAppliedDiscount(0);
            setAppliedVoucherCode(null);
          } catch (error) {
            console.error('[useCart] Error auto-clearing voucher when no items selected:', error);
          }
        }

        // Chỉ dispatch event nếu không phải từ event listener (tránh loop)
        if (!skipEventDispatch) {
          window.dispatchEvent(
            new CustomEvent('cartUpdated', { detail: { source: 'useCart-hook' } }),
          );
        }
      } catch (error) {
        console.error('[useCart] Error loading cart:', error);
        // Nếu lỗi do chưa đăng nhập
        if (error.code === 401 || error.code === 403 || error.status === 401 || error.status === 403) {
          setIsUnauthenticated(true);
          setCartItems([]);
          setSubtotal(0);
          setTotal(0);
          setAppliedDiscount(0);
          setAppliedVoucherCode(null);
        } else {
          notify.error('Không thể tải giỏ hàng. Vui lòng thử lại.');
          setCartItems([]);
          setSubtotal(0);
          setTotal(0);
        }
      } finally {
        if (!skipLoading) {
          setLoading(false);
        }
      }
    },
    [buildCartItemsWithStock],
  );

  // Load cart count (chỉ số lượng, không load toàn bộ cart)
  const loadCartCount = useCallback(async () => {
    try {
      const count = await cartService.getCartCount();
      return count;
    } catch (error) {
      return 0;
    }
  }, []);

  // Áp dụng voucher
  const applyVoucher = useCallback(async (code) => {
    try {
      const normalizedCode = (code || '').toString().trim().toUpperCase();
      // Backend sẽ kiểm tra usage limit, không cần kiểm tra ở frontend
      const cartData = await cartService.applyVoucher(normalizedCode);
      setAppliedDiscount(cartData.voucherDiscount || 0);
      setAppliedVoucherCode(cartData.appliedVoucherCode);
      setTotal(cartData.totalAmount || 0);
      // Reload lại giỏ hàng để đồng bộ với backend nhưng KHÔNG bật loading
      await loadCart(true, true);
      return cartData;
    } catch (error) {
      console.error('[useCart] Error applying voucher:', error);
      throw error;
    }
  }, [loadCart]);

  // Xóa voucher
  const clearVoucher = useCallback(async () => {
    try {
      await cartService.clearVoucher();
      setAppliedDiscount(0);
      setAppliedVoucherCode(null);
      // Reload lại giỏ hàng để đồng bộ với backend nhưng KHÔNG bật loading
      await loadCart(true, true);
    } catch (error) {
      console.error('[useCart] Error clearing voucher:', error);
      throw error;
    }
  }, [loadCart]);

  // Auto load cart khi mount
  useEffect(() => {
    if (autoLoad) {
      loadCart();
    }
  }, [autoLoad, loadCart]);

  // Lắng nghe cartUpdated event
  useEffect(() => {
    if (!listenToEvents) return;

    const handleCartUpdated = (e) => {
      // Bỏ qua event từ chính hook này hoặc từ cart-page (đã được xử lý rồi)
      if (e?.detail?.source === 'useCart-hook' || e?.detail?.source === 'cart-page') {
        return;
      }
      console.log('[useCart] Cart updated event received, reloading cart...');
      loadCart(true, true); // Skip event dispatch và loading state
    };

    window.addEventListener('cartUpdated', handleCartUpdated);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdated);
    };
  }, [listenToEvents, loadCart]);

  return {
    cartItems,
    setCartItems,
    loading,
    isUnauthenticated,
    subtotal,
    total,
    appliedDiscount,
    appliedVoucherCode,
    setAppliedDiscount,
    setAppliedVoucherCode,
    loadCart,
    loadCartCount,
    applyVoucher,
    clearVoucher,
  };
};

