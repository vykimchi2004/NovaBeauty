import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './ProductDetail.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import cartService from '~/services/cart';
import { getProductById } from '~/services/product';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import notify from '~/utils/notification';

const TABS = [
  { id: 'description', label: 'Mô tả sản phẩm' },
  { id: 'ingredients', label: 'Thành phần' },
  { id: 'benefits', label: 'Công dụng' },
  { id: 'howto', label: 'Cách dùng' },
  { id: 'highlights', label: 'Review' },
];

const REVIEW_STARS = [1, 2, 3, 4, 5];

const cx = classNames.bind(styles);

function ProductDetail() {
  const { id } = useParams();
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
      notify.warning('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
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

    // Kiểm tra nếu sản phẩm có mã màu thì phải chọn màu trước
    const hasColorCodes = colorCodes && colorCodes.length > 0;
    if (hasColorCodes && !selectedColorCode) {
      notify.warning('Vui lòng chọn mã màu trước khi thêm vào giỏ hàng');
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

  // Parse colorCodes từ manufacturingLocation (lưu dạng JSON)
  // Phải đặt trước các early return để tuân thủ Rules of Hooks
  const colorCodes = useMemo(() => {
    if (!product || !product.manufacturingLocation) return [];
    try {
      const parsed = JSON.parse(product.manufacturingLocation);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      // Nếu không phải JSON, thử parse như comma-separated
      if (product.manufacturingLocation.includes(',')) {
        return product.manufacturingLocation.split(',').map(c => c.trim()).filter(c => c);
      } else if (product.manufacturingLocation.trim()) {
        return [product.manufacturingLocation.trim()];
      }
      return [];
    }
  }, [product?.manufacturingLocation]);

  // Reset selectedColorCode khi product thay đổi
  useEffect(() => {
    setSelectedColorCode(null);
  }, [product?.id]);

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
    price: product.price || 0, // Giá sau giảm (đã áp dụng promotion nếu có)
    oldPrice: (() => {
      // Only show old price if product has valid promotion
      if (!product.promotionId || !product.promotionName) return null;
      if (!product.discountValue || product.discountValue <= 0) return null;
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
    images: product.mediaUrls && product.mediaUrls.length > 0 
      ? product.mediaUrls 
      : (product.defaultMediaUrl ? [product.defaultMediaUrl] : [image1]),
    colorCodes: colorCodes,
    texture: product.texture || '',
    skinType: product.skinType || '',
    ingredients: product.ingredients || '',
    uses: product.uses || '',
    usageInstructions: product.usageInstructions || '',
    reviewHighlights: product.characteristics || '',
  };

  return (
    <div className={cx('wrapper')}>

      <div className={cx('container')}>
        {/* Left: Image Gallery */}
        <div className={cx('image-section')}>
          <div className={cx('main-image')}>
            <img src={displayProduct.images[selectedImage] || image1} alt={displayProduct.name} />
          </div>
          <div className={cx('thumbnail-list')}>
            {displayProduct.images.map((img, index) => (
              <div
                key={index}
                className={cx('thumbnail', { active: selectedImage === index })}
                onClick={() => setSelectedImage(index)}
              >
                <img src={img || image1} alt={`${displayProduct.name} ${index + 1}`} />
              </div>
            ))}
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

          {displayProduct.colorCodes && displayProduct.colorCodes.length > 0 && (
            <div className={cx('color-section')}>
              <label className={cx('color-label')}>
                Mã màu: <span style={{ color: '#e74c3c', fontSize: '12px' }}>*</span>
              </label>
              <div className={cx('color-codes-list')}>
                {displayProduct.colorCodes.map((colorCode, index) => (
                  <button
                    key={index}
                    type="button"
                    className={cx('color-code-badge', 'color-code-button', {
                      selected: selectedColorCode === colorCode
                    })}
                    onClick={() => setSelectedColorCode(colorCode)}
                  >
                    {colorCode}
                  </button>
                ))}
              </div>
              {!selectedColorCode && (
                <div style={{ fontSize: '12px', color: '#e74c3c', marginTop: '4px' }}>
                  Vui lòng chọn mã màu
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
              disabled={addingToCart || (colorCodes.length > 0 && !selectedColorCode)}
              title={colorCodes.length > 0 && !selectedColorCode ? 'Vui lòng chọn mã màu trước' : ''}
            >
              <span>🛒</span> {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
            </button>
            <button 
              className={cx('btn-buy-now')}
              disabled={colorCodes.length > 0 && !selectedColorCode}
              title={colorCodes.length > 0 && !selectedColorCode ? 'Vui lòng chọn mã màu trước' : ''}
            >
              MUA NGAY
            </button>
            <button className={cx('btn-favorite')}>❤️</button>
          </div>

          <div className={cx('benefits')}>
            <div className={cx('benefit-item')}>
              <span>✓</span> Miễn phí giao hàng 24h
            </div>
            <div className={cx('benefit-item')}>
              <span>✓</span> Cam kết hàng chính hãng
            </div>
            <div className={cx('benefit-item')}>
              <span>✓</span> Đổi/trả hàng trong 7 ngày
            </div>
          </div>

          <div className={cx('description-section')}>
            <h3>Mô tả sản phẩm</h3>
            <p>{displayProduct.description || product.detailedDescription || 'Chưa có mô tả'}</p>
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
              {displayProduct.weight && (
                <tr className={cx('info-row')}>
                  <td className={cx('info-cell-label')}>Trọng lượng</td>
                  <td className={cx('info-cell-value')}>{displayProduct.weight} g</td>
                </tr>
              )}
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

      {/* Reviews Section - Moved to bottom */}
      <div className={cx('description-section')}>
        <h3 className={cx('reviews-title')}>Đánh giá sản phẩm</h3>
        <div className={cx('reviews-summary')}>
          <div className={cx('reviews-score')}>{displayProduct.rating > 0 ? displayProduct.rating.toFixed(1) : '0.0'}</div>
          <div className={cx('reviews-summary-content')}>
            <div className={cx('reviews-stars')}>
              {REVIEW_STARS.map((star) => (
                <span key={star} className={cx('reviews-star', { filled: star <= Math.floor(displayProduct.rating) })}>
                  ★
                </span>
              ))}
            </div>
            <div className={cx('reviews-count')}>Dựa trên {displayProduct.reviews} đánh giá</div>
          </div>
        </div>

        <div className={cx('review-form')}>
          <h4>Viết đánh giá của bạn</h4>
          <div className={cx('review-rating-input')}>
            {REVIEW_STARS.map((star) => (
              <span key={star} className={cx('review-form-star')}>
                ★
              </span>
            ))}
          </div>
          <textarea
            rows={4}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
            className={cx('review-textarea')}
          />
          <div className={cx('review-actions')}>
            <button className={cx('review-submit')}>Gửi đánh giá</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
