import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Promo.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import { getActivePromotions } from '~/services/promotion';
import { getActiveProducts } from '~/services/product';
import { scrollToTop } from '~/services/utils';

const cx = classNames.bind(styles);

function Promo() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromoProducts = async () => {
      try {
        setLoading(true);
        // Lấy tất cả active products (backend đã tự động apply promotion)
        const response = await getActiveProducts();
        
        // Xử lý response có thể là array hoặc object có result
        let allProducts = [];
        if (Array.isArray(response)) {
          allProducts = response;
        } else if (response && Array.isArray(response.result)) {
          allProducts = response.result;
        } else if (response && typeof response === 'object') {
          // Thử extract từ các field khác
          allProducts = response.data || response.products || [];
        }
        
        console.log('[Promo] All products received:', allProducts.length);
        console.log('[Promo] Sample product:', allProducts[0]);
        
        // Lọc các sản phẩm có promotion active (có promotionId, promotionName và discountValue > 0)
        const promoProducts = (allProducts || []).filter(
          product => product && 
                     product.id && 
                     product.promotionId &&
                     product.promotionName &&
                     product.discountValue &&
                     product.discountValue > 0 &&
                     product.price &&
                     product.price > 0
        );

        console.log('[Promo] Products with promotion:', promoProducts.length);
        if (promoProducts.length > 0) {
          console.log('[Promo] Sample promo product:', {
            id: promoProducts[0].id,
            name: promoProducts[0].name,
            price: promoProducts[0].price,
            discountValue: promoProducts[0].discountValue,
            promotionId: promoProducts[0].promotionId,
            promotionName: promoProducts[0].promotionName
          });
        } else {
          console.log('[Promo] No products with promotion found. All products:', allProducts.map(p => ({
            id: p?.id,
            name: p?.name,
            hasPromotionId: !!p?.promotionId,
            hasPromotionName: !!p?.promotionName,
            discountValue: p?.discountValue,
            price: p?.price
          })));
        }

        setProducts(promoProducts);
      } catch (error) {
        console.error('[Promo] Error fetching promo products:', error);
        console.error('[Promo] Error details:', {
          message: error.message,
          code: error.code,
          status: error.status,
          response: error.response
        });
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromoProducts();
  }, []);

  const formatPrice = (price) => {
    const value = Math.round(Number(price) || 0);
    return (
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' ₫'
    );
  };

  const getProductImage = (product) => {
    if (product.defaultMediaUrl) return product.defaultMediaUrl;
    if (product.mediaUrls && product.mediaUrls.length > 0) return product.mediaUrls[0];
    return image1;
  };

  const calculateDiscountPercentage = (product) => {
    if (!product.promotionId || !product.promotionName) return null;
    if (!product.discountValue || product.discountValue <= 0) return null;
    if (!product.price || product.price <= 0) return null;
    
    const originalPrice = product.price + product.discountValue;
    if (originalPrice <= 0) return null;
    
    const percentage = Math.round((product.discountValue / originalPrice) * 100);
    return percentage > 0 ? percentage : null;
  };

  return (
    <div className={cx('promo-page')}>
      {/* --- Nội dung: Sản phẩm khuyến mãi --- */}
      <div className={cx('content')}>
        <h1 className={cx('title')}>Khuyến mãi hot</h1>

        {loading ? (
          <div className={cx('loading')}>Đang tải sản phẩm...</div>
        ) : products.length === 0 ? (
          <div className={cx('empty')}>Chưa có sản phẩm khuyến mãi nào</div>
        ) : (
        <div className={cx('product-grid')}>
            {products.map((p) => {
              const discountPercent = calculateDiscountPercentage(p);
              const originalPrice = p.price + (p.discountValue || 0);
              return (
                <Link 
                  key={p.id} 
                  to={`/product/${p.id}`} 
                  className={cx('product-card')} 
                  onClick={() => scrollToTop()}
                >
              <div className={cx('img-wrap')}>
                    <img 
                      src={getProductImage(p)} 
                      alt={p.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = image1;
                      }}
                    />
                <span className={cx('freeship')}>HOT DEAL</span>
              </div>
              <div className={cx('info')}>
                <h4>{p.name}</h4>
                    <p className={cx('desc')}>{p.description || 'Sản phẩm chất lượng cao'}</p>
                <div className={cx('price-section')}>
                      {discountPercent ? (
                        <>
                          <span className={cx('old-price')}>{formatPrice(originalPrice)}</span>
                          <span className={cx('price')}>{formatPrice(p.price)}</span>
                          <span className={cx('discount')}>-{discountPercent}%</span>
                        </>
                      ) : (
                        <span className={cx('price')}>{formatPrice(p.price)}</span>
                      )}
                </div>
              </div>
                </Link>
              );
            })}
            </div>
        )}
      </div>
    </div>
  );
}
export default Promo;
