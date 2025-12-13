import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './ProductDetail.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import cartService from '~/services/cart';
import { getProductById } from '~/services/product';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import notify from '~/utils/notification';
import { normalizeVariantRecords, getVariantLabel } from '~/utils/productVariants';
import { getReviewsByProduct, createReview } from '~/services/review';
import orderService from '~/services/order';

const TABS = [
  { id: 'description', label: 'Mô tả sản phẩm' },
  { id: 'ingredients', label: 'Thành phần' },
  { id: 'benefits', label: 'Công dụng' },
  { id: 'howto', label: 'Cách dùng' },
  { id: 'highlights', label: 'Review' },
];



const cx = classNames.bind(styles);

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [showFixedTabs, setShowFixedTabs] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedColorCode, setSelectedColorCode] = useState(null); // Mã màu đã chọn
  const tabsSectionRef = useRef(null);
  const tabsContainerRef = useRef(null);
  
  // Review states
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newNameDisplay, setNewNameDisplay] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasPurchasedProduct, setHasPurchasedProduct] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [activeReviewTab, setActiveReviewTab] = useState('latest'); // 'latest' | 'top'
  const [expandedReviews, setExpandedReviews] = useState({});
  const contentRefs = {
    description: useRef(null),
    ingredients: useRef(null),
    benefits: useRef(null),
    howto: useRef(null),
    highlights: useRef(null),
  };

  // Fetch product from API
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[ProductDetail] Loading product with ID:', id);
        const productData = await getProductById(id);
        console.log('[ProductDetail] Product loaded:', productData);
        if (!productData || !productData.id) {
          throw new Error('Sản phẩm không tồn tại');
        }
        setProduct(productData);
      } catch (err) {
        console.error('[ProductDetail] Error loading product:', err);
        setError(err.message || 'Không thể tải thông tin sản phẩm. Vui lòng thử lại.');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    } else {
      setError('Không có ID sản phẩm');
      setLoading(false);
    }
  }, [id]);

  const smoothScrollTo = (targetPosition, duration = 600) => {
    const startPosition = window.pageYOffset || document.documentElement.scrollTop;
    const distance = targetPosition - startPosition;
    let startTime = null;

    const animation = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      window.scrollTo(0, startPosition + distance * ease);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  useEffect(() => {
    const handleScroll = () => {
      let isFixed = false;

      if (tabsSectionRef.current) {
        const rect = tabsSectionRef.current.getBoundingClientRect();
        isFixed = rect.top <= 0;
        setShowFixedTabs(isFixed);
      }

      const headerOffset = isFixed && tabsContainerRef.current
        ? tabsContainerRef.current.offsetHeight + 20
        : (tabsSectionRef.current?.offsetTop || 0) - window.pageYOffset + 20;

      const scrollPosition = window.pageYOffset + headerOffset + 1;
      let currentTab = TABS[0].id;

      TABS.forEach(({ id }) => {
        const section = contentRefs[id]?.current;
        if (!section) return;
        const sectionTop = section.offsetTop;

        if (sectionTop <= scrollPosition) {
          currentTab = id;
        }
      });

      setActiveTab((prev) => (prev === currentTab ? prev : currentTab));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = async () => {
    // Kiểm tra đăng nhập trước
    const token = storage.get(STORAGE_KEYS.TOKEN);
    if (!token) {
      // Hiển thị cảnh báo và đợi người dùng đóng, sau đó mới mở modal đăng nhập
      notify.warning('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng').then(() => {
        // Mở modal đăng nhập khi người dùng đóng cảnh báo
        window.dispatchEvent(new CustomEvent('openLoginModal'));
      });
      return;
    }

    // Kiểm tra user role
    let user = null;
    try {
      const userRaw = storage.get(STORAGE_KEYS.USER);
      if (userRaw) user = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw;
    } catch (e) {
      console.error('[ProductDetail] Error parsing user from storage:', e);
    }
    
    const userRole = user?.role?.name || user?.roleName || '';
    console.log('[ProductDetail] User info:', { 
      hasToken: !!token, 
      tokenLength: typeof token === 'string' ? token.length : 'N/A',
      userRole: userRole,
      userId: user?.id || 'N/A'
    });

    if (!product || !product.id) {
      notify.error('Sản phẩm không tồn tại');
      return;
    }

    // Kiểm tra nếu sản phẩm có variant thì phải chọn variant trước
    const hasColorVariants = colorOptions.length > 0;
    if (hasColorVariants && !selectedColorCode) {
      notify.error(`Vui lòng chọn ${variantLabel.toLowerCase()} trước khi thêm vào giỏ hàng`);
      return;
    }

    try {
      setAddingToCart(true);
      console.log('[ProductDetail] Adding to cart - productId:', product.id, 'quantity:', quantity, 'colorCode:', selectedColorCode);
      await cartService.addItem(product.id, quantity, selectedColorCode || null);
      
      // Dispatch event để cập nhật cart count trong header
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      notify.success('Đã thêm sản phẩm vào giỏ hàng!');
    } catch (error) {
      console.error('[ProductDetail] Error adding to cart:', {
        error,
        code: error.code,
        status: error.status,
        message: error.message,
        response: error.response
      });
      
      // Kiểm tra lỗi authentication (401) TRƯỚC - thường xảy ra khi token không hợp lệ hoặc thiếu
      if (error.code === 401 || error.status === 401 || 
          error.message?.includes('authentication') || 
          error.message?.includes('Full authentication is required')) {
        console.warn('[ProductDetail] 401 Unauthorized - Token may be missing or invalid');
        notify.warning('Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại.');
        storage.remove(STORAGE_KEYS.TOKEN);
        storage.remove(STORAGE_KEYS.USER);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      
      // Kiểm tra lỗi permission (403) - xảy ra khi user không có quyền
      if (error.code === 403 || error.status === 403) {
        console.warn('[ProductDetail] 403 Forbidden - User may not have CUSTOMER role');
        // Kiểm tra user role từ storage
        let user = null;
        try {
          const userRaw = storage.get(STORAGE_KEYS.USER);
          if (userRaw) user = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw;
        } catch (e) {
          console.error('Error parsing user from storage:', e);
        }
        
        const userRole = user?.role?.name || user?.roleName || '';
        console.log('[ProductDetail] User role from storage:', userRole);
        
        if (userRole && userRole !== 'CUSTOMER') {
          notify.error(`Tài khoản ${userRole} không thể thêm sản phẩm vào giỏ hàng. Vui lòng đăng nhập bằng tài khoản CUSTOMER.`);
        } else {
          notify.error('Bạn không có quyền thêm sản phẩm vào giỏ hàng. Vui lòng đăng nhập bằng tài khoản khách hàng.');
        }
        return; // Không reload nếu là lỗi permission
      }
      
      // Các lỗi khác
      if (error.message && error.message.includes('Sản phẩm không tồn tại')) {
        notify.error('Sản phẩm không tồn tại trong hệ thống. Vui lòng chọn sản phẩm khác.');
      } else {
        notify.error(error.message || 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    // Kiểm tra đăng nhập trước
    const token = storage.get(STORAGE_KEYS.TOKEN);
    if (!token) {
      // Hiển thị cảnh báo và đợi người dùng đóng, sau đó mới mở modal đăng nhập
      notify.warning('Vui lòng đăng nhập để mua sản phẩm').then(() => {
        // Mở modal đăng nhập khi người dùng đóng cảnh báo
        window.dispatchEvent(new CustomEvent('openLoginModal'));
      });
      return;
    }

    // Kiểm tra user role
    let user = null;
    try {
      const userRaw = storage.get(STORAGE_KEYS.USER);
      if (userRaw) user = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw;
    } catch (e) {
      console.error('[ProductDetail] Error parsing user from storage:', e);
    }
    
    const userRole = user?.role?.name || user?.roleName || '';
    
    if (!product || !product.id) {
      notify.error('Sản phẩm không tồn tại');
      return;
    }

    // Kiểm tra nếu sản phẩm có variant thì phải chọn variant trước
    const hasColorVariants = colorOptions.length > 0;
    if (hasColorVariants && !selectedColorCode) {
      notify.error(`Vui lòng chọn ${variantLabel.toLowerCase()} trước khi mua`);
      return;
    }

    try {
      setAddingToCart(true);
      console.log('[ProductDetail] Buy now (direct) - productId:', product.id, 'quantity:', quantity, 'colorCode:', selectedColorCode);
      
      // Chuyển đến trang checkout với thông tin sản phẩm để checkout trực tiếp (không thêm vào giỏ hàng)
      navigate('/checkout', { 
        state: { 
          directCheckout: true,
          productId: product.id,
          quantity: quantity,
          colorCode: selectedColorCode || null
        } 
      });
    } catch (error) {
      console.error('[ProductDetail] Error in buy now:', {
        error,
        code: error.code,
        status: error.status,
        message: error.message,
        response: error.response
      });
      
      // Kiểm tra lỗi authentication (401)
      if (error.code === 401 || error.status === 401 || 
          error.message?.includes('authentication') || 
          error.message?.includes('Full authentication is required')) {
        console.warn('[ProductDetail] 401 Unauthorized - Token may be missing or invalid');
        notify.warning('Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại.');
        storage.remove(STORAGE_KEYS.TOKEN);
        storage.remove(STORAGE_KEYS.USER);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      
      // Kiểm tra lỗi permission (403)
      if (error.code === 403 || error.status === 403) {
        console.warn('[ProductDetail] 403 Forbidden - User may not have CUSTOMER role');
        let user = null;
        try {
          const userRaw = storage.get(STORAGE_KEYS.USER);
          if (userRaw) user = typeof userRaw === 'string' ? JSON.parse(userRaw) : userRaw;
        } catch (e) {
          console.error('Error parsing user from storage:', e);
        }
        
        const userRole = user?.role?.name || user?.roleName || '';
        
        if (userRole && userRole !== 'CUSTOMER') {
          notify.error(`Tài khoản ${userRole} không thể mua sản phẩm. Vui lòng đăng nhập bằng tài khoản CUSTOMER.`);
        } else {
          notify.error('Bạn không có quyền mua sản phẩm. Vui lòng đăng nhập bằng tài khoản khách hàng.');
        }
        return;
      }
      
      // Các lỗi khác
      if (error.message && error.message.includes('Sản phẩm không tồn tại')) {
        notify.error('Sản phẩm không tồn tại trong hệ thống. Vui lòng chọn sản phẩm khác.');
      } else {
        notify.error(error.message || 'Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (contentRefs[tabId]?.current) {
      const element = contentRefs[tabId].current;
      if (!element) return;
      
      requestAnimationFrame(() => {
        const fixedTabsHeight = showFixedTabs && tabsContainerRef.current 
          ? tabsContainerRef.current.offsetHeight 
          : 0;
        const offset = fixedTabsHeight > 0 ? fixedTabsHeight + 20 : 20;
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const elementRect = element.getBoundingClientRect();
        const elementTop = elementRect.top + currentScrollTop;
        const targetPosition = Math.max(0, elementTop - offset);
        if (targetPosition > currentScrollTop || elementRect.top < offset) {
          smoothScrollTo(targetPosition, 600);
        }
      });
    }
  };

  // Chuẩn hóa dữ liệu biến thể màu từ manufacturingLocation (JSON dạng COLOR_VARIANTS_V1)
  const colorVariants = useMemo(
    () => normalizeVariantRecords(product?.manufacturingLocation),
    [product?.manufacturingLocation]
  );

  // Lấy variantLabel từ manufacturingLocation
  const variantLabel = useMemo(
    () => getVariantLabel(product?.manufacturingLocation),
    [product?.manufacturingLocation]
  );

  // Lấy các giá trị trọng lượng khác nhau từ variants
  const variantWeights = useMemo(() => {
    if (!colorVariants || colorVariants.length === 0) return null;
    
    const weights = new Set();
    
    colorVariants.forEach((variant) => {
      if (variant.weight !== null && variant.weight !== undefined && variant.weight !== '') {
        weights.add(Number(variant.weight));
      }
    });
    
    return weights.size > 0 ? Array.from(weights).sort((a, b) => a - b) : null;
  }, [colorVariants]);

  const colorOptions = useMemo(() => {
    if (!colorVariants.length) return [];
    const seen = new Set();
    return colorVariants.reduce((acc, variant) => {
      const code = (variant.code || variant.name || '').trim();
      // Bỏ qua variant không có code và name
      if (!code || seen.has(code)) {
        return acc;
      }
      seen.add(code);
      // Đảm bảo label luôn có giá trị, không được rỗng
      const name = (variant.name || '').trim();
      const codeValue = (variant.code || '').trim();
      const label = name || codeValue || `${variantLabel} ${acc.length + 1}`;
      
      // Chỉ thêm variant nếu có label hợp lệ
      if (label && label.trim()) {
        acc.push({
          code,
          label: label.trim(),
          imageUrl: variant.imageUrl || '',
          stockQuantity: variant.stockQuantity,
          price: variant.price, // Giá niêm yết của variant (nếu có)
          purchasePrice: variant.purchasePrice, // Giá nhập của variant (nếu có)
        });
      }
      return acc;
    }, [colorVariants, variantLabel]);
  }, [colorVariants, variantLabel]);

  const galleryImages = useMemo(() => {
    const urls = [];
    const pushIfValid = (url) => {
      if (url && typeof url === 'string' && !urls.includes(url)) {
        urls.push(url);
      }
    };

    pushIfValid(product?.defaultMediaUrl);
    if (Array.isArray(product?.mediaUrls)) {
      product.mediaUrls.forEach(pushIfValid);
    }

    colorVariants.forEach((variant) => {
      pushIfValid(variant?.imageUrl);
    });

    return urls.length ? urls : [image1];
  }, [product?.defaultMediaUrl, product?.mediaUrls, colorVariants]);

  const isVideoUrl = (url = '') => {
    const normalized = url?.split('?')[0]?.toLowerCase() || '';
    const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.ogg'];
    return videoExtensions.some((ext) => normalized.endsWith(ext));
  };

  const mediaList = useMemo(
    () =>
      (galleryImages || []).map((url) => ({
        url,
        type: isVideoUrl(url) ? 'VIDEO' : 'IMAGE',
      })),
    [galleryImages],
  );

  // Reset selectedColorCode khi product thay đổi
  useEffect(() => {
    setSelectedColorCode(null);
  }, [product?.id]);

  // Fetch reviews for product
  useEffect(() => {
    if (!id) return;

    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const data = await getReviewsByProduct(id);
        const serverReviews = Array.isArray(data) ? data : [];
        console.log(`Fetched ${serverReviews.length} reviews for product ${id}`);
        setReviews(serverReviews);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [id]);

  // Check if user is logged in - tính toán một lần
  const isLoggedIn = !!storage.get(STORAGE_KEYS.TOKEN);

  // Check if user has purchased this product
  useEffect(() => {
    const checkUserPurchase = async () => {
      if (!id) {
        setHasPurchasedProduct(false);
        setCheckingPurchase(false);
        return;
      }

      // Kiểm tra đăng nhập trực tiếp trong useEffect để tránh dependency
      const token = storage.get(STORAGE_KEYS.TOKEN);
      if (!token) {
        setHasPurchasedProduct(false);
        setCheckingPurchase(false);
        return;
      }

      try {
        setCheckingPurchase(true);
        const orders = await orderService.getMyOrders();
        
        // Kiểm tra xem có đơn hàng nào chứa sản phẩm này không
        // Đơn hàng phải ở trạng thái đã giao hàng (DELIVERED) - khớp với backend
        const hasPurchased = orders.some((order) => {
          // Chỉ kiểm tra các đơn hàng đã được giao (status: DELIVERED)
          if (order.status !== 'DELIVERED') {
            return false;
          }

          // Kiểm tra trong order items
          if (order.items && Array.isArray(order.items)) {
            return order.items.some((item) => {
              // Kiểm tra productId hoặc product.id
              const itemProductId = item.productId || item.product?.id;
              return itemProductId === id || itemProductId === product?.id;
            });
          }
          return false;
        });

        setHasPurchasedProduct(hasPurchased);
        console.log(`[ProductDetail] User has purchased product ${id}:`, hasPurchased);
      } catch (err) {
        console.error('Error checking user purchase:', err);
        // Nếu có lỗi, mặc định là false để không cho phép đánh giá
        setHasPurchasedProduct(false);
      } finally {
        setCheckingPurchase(false);
      }
    };

    checkUserPurchase();
  }, [id, product?.id]);

  // Format review date
  const formatReviewDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN');
  };

  // Render stars
  const renderStars = (rating = 0) => {
    const resolved = Math.max(0, Math.min(5, rating || 0));
    return Array.from({ length: 5 }, (_, idx) => {
      const filled = idx < Math.round(resolved);
      return (
        <span key={idx} className={cx('star', { filled })}>
          ★
        </span>
      );
    });
  };

  // Sorted reviews based on active tab
  const sortedReviews = useMemo(() => {
    if (!Array.isArray(reviews)) return [];
    const copy = [...reviews];
    if (activeReviewTab === 'latest') {
      return copy.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );
    }
    // "Đánh giá cao nhất" – chỉ hiển thị các đánh giá 5 sao, ưu tiên mới nhất
    return copy
      .filter((review) => Number(review?.rating) === 5)
      .sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );
  }, [reviews, activeReviewTab]);

  // Calculate average rating and review count (will be computed after displayProduct is defined)

  // Rating distribution
  const ratingDistribution = useMemo(() => {
    const base = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (Array.isArray(reviews) && reviews.length > 0) {
      reviews.forEach((r) => {
        const star = Math.round(r.rating || 0);
        if (base[star] !== undefined) {
          base[star] += 1;
        }
      });
      return base;
    }
    return base;
  }, [reviews]);

  const totalRatingCount = useMemo(
    () => Object.values(ratingDistribution).reduce((sum, v) => sum + v, 0),
    [ratingDistribution],
  );

  // Tính giá hiển thị: nếu đã chọn mã màu và variant có giá riêng, dùng giá variant
  const displayPrice = useMemo(() => {
    if (!product) return 0;
    // Nếu đã chọn mã màu và variant có giá riêng
    if (selectedColorCode && colorOptions.length > 0) {
      const selectedOption = colorOptions.find(opt => opt.code === selectedColorCode);
      if (selectedOption && selectedOption.price && parseFloat(selectedOption.price) > 0) {
        // Variant có giá riêng, tính giá hiển thị (có thuế)
        const variantPrice = parseFloat(selectedOption.price);
        const tax = product.tax != null ? product.tax : 0.08; // Tax là decimal (0.08 = 8%)
        const priceWithTax = variantPrice * (1 + tax);
        return Math.round(priceWithTax);
      }
    }
    // Dùng giá sản phẩm (đã áp dụng promotion nếu có)
    return product.price || 0;
  }, [product, selectedColorCode, colorOptions]);

  // Handle open login modal
  const openLoginModal = () => {
    window.dispatchEvent(new CustomEvent('openLoginModal'));
  };

  // Handle submit review - GIỐNG 100% LUMINABOOK
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!id || !isLoggedIn || submittingReview) return;

    try {
      setSubmittingReview(true);
      const trimmedName = newNameDisplay.trim();
      const trimmedComment = newComment.trim();
      // Payload structure giống LuminaBook
      const payload = {
        nameDisplay: trimmedName || undefined,
        rating: newRating,
        comment: trimmedComment || undefined,
        product: {
          id: id,
        },
      };
      
      console.log('[ProductDetail] Submitting review payload:', JSON.stringify(payload, null, 2));

      const { ok, status, data } = await createReview(payload);
      if (status === 401) {
        notify.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại để viết đánh giá.');
        setIsReviewModalOpen(false);
        openLoginModal();
        return;
      }

      // Kiểm tra kết quả từ server
      if (!ok && status >= 400) {
        const errorMessage = data?.message || data?.error || 'Không thể gửi đánh giá';
        // Nếu là lỗi chưa mua sản phẩm, cập nhật lại trạng thái
        if (errorMessage.includes('chưa mua sản phẩm') || errorMessage.includes('REVIEW_NOT_PURCHASED')) {
          setHasPurchasedProduct(false);
        }
        notify.error(`${errorMessage}${status ? ` (Lỗi: ${status})` : ''}`);
        return;
      }

      // Đóng modal và reset form
      setIsReviewModalOpen(false);
      setNewRating(5);
      setHoverRating(0);
      setNewNameDisplay('');
      setNewComment('');

      // Reload reviews từ server ngay lập tức và retry nếu cần
      const reloadReviews = async (retryCount = 0) => {
        try {
          setLoadingReviews(true);
          const refreshedData = await getReviewsByProduct(id);
          const refreshedReviews = Array.isArray(refreshedData) ? refreshedData : [];
          console.log('Reloaded reviews:', refreshedReviews.length, 'reviews');
          setReviews(refreshedReviews);
        } catch (refreshErr) {
          console.error('Error refreshing reviews:', refreshErr);
          // Retry nếu chưa quá 2 lần
          if (retryCount < 2) {
            console.log(`Retrying reload reviews (attempt ${retryCount + 1})...`);
            setTimeout(() => reloadReviews(retryCount + 1), 1000);
            return;
          }
        } finally {
          setLoadingReviews(false);
        }
      };

      // Đợi một chút để đảm bảo database đã commit, sau đó reload
      setTimeout(() => reloadReviews(), 500);

      notify.success('Gửi đánh giá thành công');
    } catch (err) {
      console.error('Error submitting review:', err);
      notify.error('Có lỗi xảy ra khi gửi đánh giá.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={cx('wrapper')}>
        <div className={cx('loading')}>Đang tải thông tin sản phẩm...</div>
      </div>
    );
  }

  // Error state (but still show product if available)
  if (error && !product) {
    return (
      <div className={cx('wrapper')}>
        <div className={cx('error')}>
          <p>{error}</p>
          <p style={{ fontSize: '14px', marginTop: '10px', color: '#999' }}>
            Product ID: {id}
          </p>
          <p style={{ fontSize: '12px', marginTop: '5px', color: '#999' }}>
            Vui lòng kiểm tra lại ID sản phẩm hoặc thử lại sau.
          </p>
        </div>
      </div>
    );
  }

  // No product
  if (!product) {
    return (
      <div className={cx('wrapper')}>
        <div className={cx('error')}>
          <p>Sản phẩm không tồn tại</p>
          <p style={{ fontSize: '14px', marginTop: '10px', color: '#999' }}>
            Product ID: {id}
          </p>
        </div>
      </div>
    );
  }

  // Map API product data to display format
  const displayProduct = {
    id: product.id,
    brand: product.brand || 'NOVA BEAUTY',
    name: product.name || 'Sản phẩm',
    description: product.description || '',
    price: displayPrice, // Giá hiển thị (có thể từ variant hoặc sản phẩm)
    oldPrice: (() => {
      // Only show old price if product has valid promotion
      if (!product.promotionId || !product.promotionName) return null;
      if (!product.discountValue || product.discountValue <= 0) return null;
      // Nếu đang dùng giá variant, không hiển thị oldPrice
      if (selectedColorCode && colorOptions.length > 0) {
        const selectedOption = colorOptions.find(opt => opt.code === selectedColorCode);
        if (selectedOption && selectedOption.price && parseFloat(selectedOption.price) > 0) {
          return null; // Không hiển thị oldPrice khi dùng giá variant
        }
      }
      if (!product.price || product.price <= 0) return null;
      const originalPrice = product.price + product.discountValue;
      const discountPercent = Math.round((product.discountValue / originalPrice) * 100);
      // Only return old price if discount percentage is greater than 0
      return discountPercent > 0 ? originalPrice : null;
    })(),
    rating: product.averageRating || 0,
    reviews: product.reviewCount || 0,
    sku: product.id ? String(product.id).substring(0, 8) : 'N/A',
    origin: product.brandOrigin || 'N/A',
    size: product.size || '',
    weight: product.weight || null,
    images: galleryImages,
    texture: product.texture || '',
    skinType: product.skinType || '',
    ingredients: product.ingredients || '',
    uses: product.uses || '',
    usageInstructions: product.usageInstructions || '',
    reviewHighlights: product.characteristics || '',
  };

  const topDescription =
    displayProduct.description || product.detailedDescription || 'Chưa có mô tả';
  const isLongTopDescription =
    typeof topDescription === 'string' && topDescription.length > 180;

  const totalMedia = mediaList.length;
  const MAX_VISIBLE_THUMBS = 7;
  const hasThumbnailOverflow = totalMedia > MAX_VISIBLE_THUMBS;
  const visibleMedia = hasThumbnailOverflow
    ? mediaList.slice(0, MAX_VISIBLE_THUMBS - 1)
    : mediaList;
  const hiddenCount = hasThumbnailOverflow ? totalMedia - (MAX_VISIBLE_THUMBS - 1) : 0;

  const selectedMedia =
    totalMedia > 0 ? mediaList[selectedImage] || mediaList[0] : { url: image1, type: 'IMAGE' };

  const handlePrevImage = () => {
    if (!totalMedia) return;
    setSelectedImage((prev) => (prev - 1 + totalMedia) % totalMedia);
  };

  const handleNextImage = () => {
    if (!totalMedia) return;
    setSelectedImage((prev) => (prev + 1) % totalMedia);
  };

  return (
    <div className={cx('wrapper')}>

      <div className={cx('container')}>
        {/* Left: Image Gallery */}
        <div className={cx('image-section')}>
          <div className={cx('main-image')}>
            {totalMedia > 1 && (
              <button
                type="button"
                className={cx('image-nav-arrow', 'prev')}
                onClick={handlePrevImage}
                aria-label="Ảnh trước"
              >
                ‹
              </button>
            )}
            {selectedMedia.type === 'VIDEO' ? (
              <video
                className={cx('main-video')}
                src={selectedMedia.url}
                controls
              >
                Trình duyệt không hỗ trợ video.
              </video>
            ) : (
              <img src={selectedMedia.url || image1} alt={displayProduct.name} />
            )}
            {totalMedia > 1 && (
              <button
                type="button"
                className={cx('image-nav-arrow', 'next')}
                onClick={handleNextImage}
                aria-label="Ảnh tiếp theo"
              >
                ›
              </button>
            )}
          </div>
          <div className={cx('thumbnail-list')}>
            {visibleMedia.map((media, index) => (
              <div
                key={index}
                className={cx('thumbnail', { active: selectedImage === index })}
                onClick={() => setSelectedImage(index)}
              >
                {media.type === 'VIDEO' ? (
                  <div className={cx('video-thumb')}>
                    <video
                      className={cx('video-thumb-video')}
                      src={media.url}
                      muted
                      preload="metadata"
                    />
                    <span className={cx('video-thumb-badge')}>Video</span>
                  </div>
                ) : (
                  <img src={media.url || image1} alt={`${displayProduct.name} ${index + 1}`} />
                )}
              </div>
            ))}
            {hasThumbnailOverflow && (
              <div
                className={cx('thumbnail', 'more-thumbnail')}
                onClick={() => setSelectedImage(MAX_VISIBLE_THUMBS - 1)}
              >
                <span className={cx('more-thumbnail-text')}>+{hiddenCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Product Information */}
        <div className={cx('info-section')}>
          <div className={cx('brand')}>{displayProduct.brand}</div>
          <h1 className={cx('product-name')}>{displayProduct.name}</h1>

          <div className={cx('rating-section')}>
            <div className={cx('stars')}>
              {[...Array(5)].map((_, i) => (
                <span key={i} className={cx('star', { filled: i < Math.floor(displayProduct.rating) })}>
                  ★
                </span>
              ))}
            </div>
            <span className={cx('reviews')}>({displayProduct.reviews})</span>
            <span className={cx('origin')}>Xuất xứ: {displayProduct.origin}</span>
            <span className={cx('sku')}>SKU: {displayProduct.sku}</span>
            {product.quantitySold !== undefined && product.quantitySold !== null && (
              <span className={cx('sold-count')}>Đã bán: {product.quantitySold.toLocaleString('vi-VN')}</span>
            )}
          </div>

          <div className={cx('price-section')}>
            <div className={cx('current-price')}>{Math.round(displayProduct.price).toLocaleString('vi-VN')}đ</div>
            {displayProduct.oldPrice && product.promotionId && product.promotionName && (() => {
              const discountPercent = Math.round((product.discountValue / displayProduct.oldPrice) * 100);
              // Only show if discount percentage is greater than 0
              if (discountPercent <= 0) return null;
              return (
                <div className={cx('old-price-wrapper')}>
                  <span className={cx('old-price')}>{Math.round(displayProduct.oldPrice).toLocaleString('vi-VN')}đ</span>
                  <span className={cx('discount-tag')}>
                    -{discountPercent}%
                  </span>
                </div>
              );
            })()}
            <div className={cx('vat-note')}>Giá này đã bao gồm VAT</div>
          </div>

          {colorOptions.length > 0 && (
            <div className={cx('color-section')}>
              <label className={cx('color-label')}>
                {variantLabel}: <span style={{ color: '#e74c3c', fontSize: '12px' }}></span>
              </label>
              <div className={cx('color-codes-list')}>
                {colorOptions.map((option, index) => (
                  <button
                    key={option.code || index}
                    type="button"
                    className={cx('color-code-badge', 'color-code-button', {
                      selected: selectedColorCode === option.code
                    })}
                    onClick={() => {
                      setSelectedColorCode(option.code);
                      if (option.imageUrl) {
                        const imageIndex = galleryImages.findIndex((img) => img === option.imageUrl);
                        if (imageIndex >= 0) {
                          setSelectedImage(imageIndex);
                        }
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {!selectedColorCode && (
                <div className={cx('color-error-message')}>
                  <span className={cx('color-error-text')}>Vui lòng chọn {variantLabel.toLowerCase()}</span>
                </div>
              )}
            </div>
          )}

          <div className={cx('quantity-section')}>
            <label className={cx('quantity-label')}>Số lượng:</label>
            <div className={cx('quantity-control')}>
              <button onClick={() => handleQuantityChange(-1)} className={cx('qty-btn')}>
                -
              </button>
              <input type="number" value={quantity} readOnly className={cx('qty-input')} />
              <button onClick={() => handleQuantityChange(1)} className={cx('qty-btn')}>
                +
              </button>
            </div>
          </div>

          <div className={cx('action-buttons')}>
            <button 
              className={cx('btn-cart')} 
              onClick={handleAddToCart}
              disabled={addingToCart || (colorOptions.length > 0 && !selectedColorCode)}
              title={colorOptions.length > 0 && !selectedColorCode ? `Vui lòng chọn ${variantLabel.toLowerCase()} trước` : ''}
            >
              <span>🛒</span> {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
            </button>
            <button 
              className={cx('btn-buy-now')}
              onClick={handleBuyNow}
              disabled={addingToCart || (colorOptions.length > 0 && !selectedColorCode)}
              title={colorOptions.length > 0 && !selectedColorCode ? `Vui lòng chọn ${variantLabel.toLowerCase()} trước` : ''}
            >
              {addingToCart ? 'Đang xử lý...' : 'MUA NGAY'}
            </button>
           
          </div>

          <div className={cx('benefits')}>
            <div className={cx('benefit-item')}>
              <span>✓</span> Cam kết hàng chính hãng
            </div>
            <div className={cx('benefit-item')}>
              <span>✓</span> Đổi/trả hàng trong 7 ngày
            </div>
          </div>

          <div className={cx('description-section')}>
            <h3>Mô tả sản phẩm</h3>
            <p className={cx('short-description')}>{topDescription}</p>
            {isLongTopDescription && (
              <button
                type="button"
                className={cx('short-description-more')}
                onClick={() => handleTabClick('description')}
              >
                Xem thêm mô tả chi tiết
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Info Table */}
      <div className={cx('description-section')}>
        <h3>Thông tin sản phẩm</h3>
        <div className={cx('info-table-wrapper')}>
          <table className={cx('info-table')}>
            <tbody>
              {displayProduct.brand && (
                <tr className={cx('info-row')}>
                  <td className={cx('info-cell-label')}>Thương hiệu</td>
                  <td className={cx('info-cell-value')}>{displayProduct.brand}</td>
                </tr>
              )}
              {displayProduct.origin && displayProduct.origin !== 'N/A' && (
                <tr className={cx('info-row')}>
                  <td className={cx('info-cell-label')}>Xuất xứ thương hiệu</td>
                  <td className={cx('info-cell-value')}>{displayProduct.origin}</td>
                </tr>
              )}
              {displayProduct.size && (
                <tr className={cx('info-row')}>
                  <td className={cx('info-cell-label')}>Kích thước / Quy cách</td>
                  <td className={cx('info-cell-value')}>{displayProduct.size}</td>
                </tr>
              )}
              {displayProduct.texture && (
                <tr className={cx('info-row')}>
                  <td className={cx('info-cell-label')}>Kết cấu</td>
                  <td className={cx('info-cell-value')}>{displayProduct.texture}</td>
                </tr>
              )}
              {displayProduct.skinType && (
                <tr className={cx('info-row')}>
                  <td className={cx('info-cell-label')}>Loại da</td>
                  <td className={cx('info-cell-value')}>{displayProduct.skinType}</td>
                </tr>
              )}
              {(() => {
                // Hiển thị trọng lượng: nếu có variant với trọng lượng khác nhau, hiển thị tất cả
                const displayWeight = () => {
                  if (variantWeights && variantWeights.length > 0) {
                    // Có variant với trọng lượng riêng
                    const weightValues = variantWeights.map(w => `${w} g`).join(' & ');
                    return weightValues;
                  }
                  // Dùng trọng lượng chính của sản phẩm
                  return displayProduct.weight ? `${displayProduct.weight} g` : null;
                };

                const weightValue = displayWeight();
                return weightValue ? (
                  <tr className={cx('info-row')}>
                    <td className={cx('info-cell-label')}>Trọng lượng</td>
                    <td className={cx('info-cell-value')}>{weightValue}</td>
                  </tr>
                ) : null;
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className={cx('description-section')} ref={tabsSectionRef}>
        {/* Fixed tabs that appear when scrolling */}
        {showFixedTabs && (
          <div className={cx('tabs-container', 'tabs-fixed')} ref={tabsContainerRef}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
                className={cx('tab-button', { active: activeTab === t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        
        {/* Original tabs container */}
        <div className={cx('tabs-container')}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabClick(t.id)}
              className={cx('tab-button', { active: activeTab === t.id })}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Description Section */}
        <div ref={contentRefs.description} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Mô tả sản phẩm</h4>
          {displayProduct.description ? (
            <p>{displayProduct.description}</p>
          ) : (
            <p>Chưa có mô tả sản phẩm</p>
          )}
        </div>

        {/* Ingredients Section */}
        <div ref={contentRefs.ingredients} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Thành phần</h4>
          {displayProduct.ingredients ? (
            <p>{displayProduct.ingredients}</p>
          ) : (
            <p>Chưa có thông tin thành phần</p>
          )}
        </div>

        {/* Benefits Section */}
        <div ref={contentRefs.benefits} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Công dụng</h4>
          {displayProduct.uses ? (
            <p>{displayProduct.uses}</p>
          ) : (
            <p>Chưa có thông tin công dụng</p>
          )}
        </div>

        {/* How to Use Section */}
        <div ref={contentRefs.howto} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Cách dùng</h4>
          {displayProduct.usageInstructions ? (
            <p>{displayProduct.usageInstructions}</p>
          ) : (
            <p>Chưa có hướng dẫn sử dụng</p>
          )}
        </div>

        {/* Highlights Section */}
        <div ref={contentRefs.highlights} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Review (Ưu điểm)</h4>
          {displayProduct.reviewHighlights ? (
            <p>{displayProduct.reviewHighlights}</p>
          ) : (
            <p>Chưa có đánh giá</p>
          )}
        </div>
      </div>

      {/* Reviews Section - Full width card like NovaBeauty */}
      <div className={cx('review-card')}>
        <h3 className={cx('card-title')}>Đánh giá sản phẩm</h3>
        <div className={cx('review-content')}>
          <div className={cx('review-summary')}>
            <div className={cx('review-score')}>
              <div className={cx('score-value-row')}>
                <div className={cx('score-value')}>
                  {(() => {
                    const count = reviews.length > 0 ? reviews.length : (displayProduct.reviews || 0);
                    const avg = reviews.length > 0
                      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
                      : (displayProduct.rating || 0);
                    return count > 0 ? avg.toFixed(1) : '0';
                  })()}
                </div>
                <div className={cx('score-max')}>/5</div>
              </div>
              <div className={cx('score-stars')}>
                {renderStars((() => {
                  const avg = reviews.length > 0
                    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
                    : (displayProduct.rating || 0);
                  return avg;
                })())}
              </div>
              <div className={cx('score-count')}>
                ({(() => {
                  const count = reviews.length > 0 ? reviews.length : (displayProduct.reviews || 0);
                  return count;
                })()} đánh giá)
              </div>
            </div>
            <div className={cx('rating-bars')}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star] || 0;
                const percent =
                  totalRatingCount > 0
                    ? Math.round((count / totalRatingCount) * 100)
                    : 0;

                return (
                  <div key={star} className={cx('rating-bar-row')}>
                    <span>{star} sao</span>
                    <div className={cx('rating-bar-track')}>
                      <div
                        className={cx('rating-bar-fill')}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className={cx('rating-percent')}>
                      {percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={cx('review-action')}>
            {!isLoggedIn ? (
              <p className={cx('login-prompt')}>
                Vui lòng{' '}
                <button
                  type="button"
                  className={cx('inline-link')}
                  onClick={openLoginModal}
                >
                  đăng nhập
                </button>
                {' '}để viết đánh giá.
              </p>
            ) : checkingPurchase ? (
              <p className={cx('login-prompt')}>
                Đang kiểm tra quyền đánh giá...
              </p>
            ) : !hasPurchasedProduct ? (
              <p className={cx('login-prompt')}>
                Chỉ khách hàng đã mua sản phẩm mới được viết đánh giá.
              </p>
            ) : (
              <div className={cx('write-review-container')}>
                <button
                  type="button"
                  className={cx('write-review-button')}
                  onClick={() => setIsReviewModalOpen(true)}
                >
                  Viết đánh giá
                </button>
                {isReviewModalOpen && (
                  <div className={cx('review-modal-overlay')} onClick={() => setIsReviewModalOpen(false)}>
                    <div className={cx('review-modal')} onClick={(e) => e.stopPropagation()}>
                      <h4>Viết đánh giá sản phẩm</h4>
                      <form onSubmit={handleSubmitReview}>
                        <div className={cx('review-stars-input')}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className={cx(
                                star <= (hoverRating || newRating)
                                  ? 'star-input-active'
                                  : 'star-input'
                              )}
                              onClick={() => setNewRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          className={cx('review-name-input')}
                          placeholder="Nhập tên hiển thị khi đánh giá (tùy chọn, có thể đặt tên bất kỳ)"
                          value={newNameDisplay}
                          onChange={(e) => setNewNameDisplay(e.target.value)}
                          maxLength={100}
                        />
                        <textarea
                          className={cx('review-textarea')}
                          rows={4}
                          placeholder="Nhập nhận xét của bạn về sản phẩm"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <div className={cx('review-modal-actions')}>
                          <button
                            type="button"
                            className={cx('review-cancel-btn')}
                            onClick={() => {
                              setIsReviewModalOpen(false);
                              setHoverRating(0);
                            }}
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            className={cx('review-submit-btn')}
                            disabled={submittingReview}
                          >
                            {submittingReview ? 'Đang gửi...' : 'Gửi nhận xét'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Review list with tabs */}
        <div className={cx('review-list-wrapper')}>
          <div className={cx('review-tabs')}>
            <button
              type="button"
              className={cx('review-tab', { 'review-tab-active': activeReviewTab === 'latest' })}
              onClick={() => setActiveReviewTab('latest')}
            >
              Mới nhất
            </button>
            <button
              type="button"
              className={cx('review-tab', { 'review-tab-active': activeReviewTab === 'top' })}
              onClick={() => setActiveReviewTab('top')}
            >
              Đánh giá cao nhất
            </button>
          </div>

          {loadingReviews ? (
            <div className={cx('loading-reviews')}>Đang tải đánh giá...</div>
          ) : sortedReviews.length === 0 ? (
            <p className={cx('no-review-text')}>
              Chưa có đánh giá cho sản phẩm này.
            </p>
          ) : (
            sortedReviews.map((review) => {
              const reviewId = review.id || `${review.userId}-${review.createdAt}`;
              const fullComment = review.comment || '';
              const maxLength = 260;
              const isLong = fullComment.length > maxLength;
              const isExpanded = !!expandedReviews[reviewId];
              const displayComment =
                !isLong || isExpanded
                  ? fullComment
                  : `${fullComment.slice(0, maxLength)}...`;

              // Xử lý tên hiển thị: ưu tiên nameDisplay, sau đó userName, cuối cùng là "Người dùng ẩn danh"
              const displayName = (() => {
                const nameDisplay = review.nameDisplay?.trim();
                if (nameDisplay) return nameDisplay;
                const userName = review.userName?.trim();
                if (userName) return userName;
                return 'Người dùng ẩn danh';
              })();

              // Đảm bảo rating luôn có giá trị hợp lệ
              const reviewRating = review.rating !== undefined && review.rating !== null
                ? Number(review.rating)
                : 0;

              return (
                <div key={reviewId} className={cx('review-item')}>
                  <div className={cx('review-item-header')}>
                    <div className={cx('reviewer-name')}>
                      {displayName}
                    </div>
                    <div className={cx('review-date')}>
                      {formatReviewDate(review.createdAt)}
                    </div>
                  </div>
                  <div className={cx('review-stars-row')}>
                    {renderStars(reviewRating)}
                  </div>
                  {fullComment && fullComment.trim() && (
                    <div className={cx('review-comment')}>
                      <p>{displayComment}</p>
                      {isLong && (
                        <button
                          type="button"
                          className={cx('more-link')}
                          onClick={() =>
                            setExpandedReviews((prev) => ({
                              ...prev,
                              [reviewId]: !isExpanded,
                            }))
                          }
                        >
                          {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                        </button>
                      )}
                    </div>
                  )}
                  {review.reply && review.reply.trim() && (
                    <div className={cx('review-reply')}>
                      <div className={cx('reply-header')}>
                        <span className={cx('reply-label')}>Phản hồi từ NovaBeauty:</span>
                        {review.replyAt && (
                          <span className={cx('reply-date')}>
                            {formatReviewDate(review.replyAt)}
                          </span>
                        )}
                      </div>
                      <p className={cx('reply-text')}>{review.reply}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
