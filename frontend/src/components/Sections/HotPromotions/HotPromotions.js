import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './HotPromotions.module.scss';
import productImg from '../../../assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';
import { getActiveProducts } from '~/services/product';
import { getActivePromotions } from '~/services/promotion';

const cx = classNames.bind(styles);

function HotPromotions() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchPromoProducts = async () => {
      try {
        setLoading(true);
        
        // Debug: Fetch active promotions to check
        try {
          const promotionsData = await getActivePromotions();
          const promotionsList = Array.isArray(promotionsData) ? promotionsData : (promotionsData?.result && Array.isArray(promotionsData.result) ? promotionsData.result : []);
          console.log('[HotPromotions] Active promotions:', promotionsList.length);
          if (promotionsList.length > 0) {
            console.log('[HotPromotions] Active promotions details:', promotionsList.map(p => ({
              id: p?.id,
              name: p?.name,
              status: p?.status,
              isActive: p?.isActive,
              applyScope: p?.applyScope,
              categoryIds: p?.categoryIds,
              categoryNames: p?.categoryNames,
              startDate: p?.startDate,
              expiryDate: p?.expiryDate,
              discountValue: p?.discountValue
            })));
          }
        } catch (err) {
          console.error('[HotPromotions] Error fetching promotions:', err);
        }
        
        const data = await getActiveProducts();
        // Đảm bảo data là array
        const productsList = Array.isArray(data) ? data : (data?.result && Array.isArray(data.result) ? data.result : []);
        
        console.log('[HotPromotions] Total products:', productsList.length);
        
        // Debug: Log products with promotion info
        const productsWithPromoInfo = productsList.map(p => ({
          id: p?.id,
          name: p?.name,
          categoryId: p?.categoryId,
          categoryName: p?.categoryName,
          promotionId: p?.promotionId,
          promotionName: p?.promotionName,
          discountValue: p?.discountValue,
          price: p?.price,
          unitPrice: p?.unitPrice
        }));
        console.log('[HotPromotions] Products with promotion info:', productsWithPromoInfo);
        
        // Debug: Group by category to see which categories have products
        const productsByCategory = productsList.reduce((acc, p) => {
          const catId = p?.categoryId || 'NO_CATEGORY';
          const catName = p?.categoryName || 'NO_CATEGORY';
          if (!acc[catId]) {
            acc[catId] = { categoryId: catId, categoryName: catName, products: [] };
          }
          acc[catId].products.push({
            id: p?.id,
            name: p?.name,
            promotionId: p?.promotionId,
            discountValue: p?.discountValue
          });
          return acc;
        }, {});
        console.log('[HotPromotions] Products grouped by category:', productsByCategory);
        
        // Lọc các sản phẩm có promotion active (có promotionId, promotionName và discountValue > 0)
        const promoProducts = (productsList || []).filter(
          product => product && 
                     product.id && 
                     product.promotionId &&
                     product.promotionName &&
                     product.discountValue &&
                     product.discountValue > 0 &&
                     product.price &&
                     product.price > 0 &&
                     (product.price !== null && product.price !== undefined)
        );
        
        console.log('[HotPromotions] Filtered promo products:', promoProducts.length);
        if (promoProducts.length > 0) {
          console.log('[HotPromotions] Sample promo product:', {
            id: promoProducts[0].id,
            name: promoProducts[0].name,
            promotionId: promoProducts[0].promotionId,
            promotionName: promoProducts[0].promotionName,
            discountValue: promoProducts[0].discountValue,
            price: promoProducts[0].price
          });
        } else {
          // Debug: Check why products are filtered out
          const productsWithDiscount = productsList.filter(p => p?.discountValue && p.discountValue > 0);
          const productsWithPromoId = productsList.filter(p => p?.promotionId);
          const productsWithPromoName = productsList.filter(p => p?.promotionName);
          const productsWithCategory = productsList.filter(p => p?.categoryId);
          
          console.log('[HotPromotions] Products with discountValue > 0:', productsWithDiscount.length);
          console.log('[HotPromotions] Products with promotionId:', productsWithPromoId.length);
          console.log('[HotPromotions] Products with promotionName:', productsWithPromoName.length);
          console.log('[HotPromotions] Products with categoryId:', productsWithCategory.length);
          
          // Show sample products to debug
          if (productsWithCategory.length > 0) {
            console.log('[HotPromotions] Sample products with category:', productsWithCategory.slice(0, 3).map(p => ({
              id: p.id,
              name: p.name,
              categoryId: p.categoryId,
              categoryName: p.categoryName,
              promotionId: p.promotionId,
              promotionName: p.promotionName,
              discountValue: p.discountValue,
              price: p.price,
              unitPrice: p.unitPrice
            })));
          }
          
          if (productsWithPromoId.length > 0) {
            console.log('[HotPromotions] Sample products with promotionId (but may not have discount):', productsWithPromoId.slice(0, 3).map(p => ({
              id: p.id,
              name: p.name,
              promotionId: p.promotionId,
              promotionName: p.promotionName,
              discountValue: p.discountValue,
              price: p.price
            })));
          }
        }
        
        setProducts(promoProducts);
      } catch (error) {
        console.error('Error fetching promotion products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromoProducts();
  }, []);

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === '') return '0 ₫';
    const value = Math.round(Number(price) || 0);
    return (
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' ₫'
    );
  };

  // Calculate discount percentage from promotion
  const calculateDiscountPercentage = (product) => {
    // Only show discount if product has valid promotion
    if (!product.promotionId || !product.promotionName) return null;
    if (!product.discountValue || product.discountValue <= 0) return null;
    if (!product.price || product.price <= 0) return null;
    
    // Calculate original price: price + discountValue
    const originalPrice = product.price + product.discountValue;
    if (originalPrice <= 0) return null;
    
    // Calculate percentage: (discountValue / originalPrice) * 100
    const percentage = Math.round((product.discountValue / originalPrice) * 100);
    
    // Only return if percentage is greater than 0
    return percentage > 0 ? percentage : null;
  };

  const getProductImage = (product) => {
    if (product.defaultMediaUrl) return product.defaultMediaUrl;
    if (product.mediaUrls && product.mediaUrls.length > 0) return product.mediaUrls[0];
    return productImg;
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const check = () => {
      setCanScrollLeft(track.scrollLeft > 0);
      setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 1);
    };

    check();
    track.addEventListener('scroll', check);
    window.addEventListener('resize', check);
    return () => {
      track.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [products.length]);

  const scrollBy = (dir = 1) => {
    const track = trackRef.current;
    if (!track) return;
    const cardWrapper = track.querySelector(`.${styles['card-wrapper']}`);
    if (!cardWrapper) return;
    const step = cardWrapper.offsetWidth + 24; // gap is 24px
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  // Show section even if no products (for debugging)
  // if (!loading && products.length === 0) {
  //   return null;
  // }

  return (
    <section className={cx('container')} aria-labelledby="hot-promotions-heading">
      <div className={cx('inner')}>
        <div className={cx('headingRow')}>
          <h2 id="hot-promotions-heading" className={cx('title')}>
            KHUYẾN MÃI HOT
          </h2>
        </div>

        <div className={cx('carousel')}>
          <button
            className={cx('arrow', 'left')}
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            aria-label="Previous products"
          >
            &#10094;
          </button>

          <div className={cx('track')} ref={trackRef}>
            {loading ? (
              <div className={cx('loading')}>Đang tải...</div>
            ) : products.length === 0 ? (
              <div className={cx('empty')}>Chưa có sản phẩm khuyến mãi</div>
            ) : (
              products.map((p) => {
                const discountPercent = calculateDiscountPercentage(p);
                const originalPrice = (p.price || 0) + (p.discountValue || 0);
                return (
                  <div key={p.id} className={cx('card-wrapper')}>
                    <Link to={`/product/${p.id}`} className={cx('card')} onClick={() => scrollToTop()}>
                      <div className={cx('img-wrap')}>
                        <img
                          src={getProductImage(p)}
                          alt={p.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = productImg;
                          }}
                        />
                        <span className={cx('hot-badge')}>HOT DEAL</span>
                      </div>
                      <div className={cx('info')}>
                        <h4 className={cx('name')}>{p.name}</h4>
                        <p className={cx('desc')} title={p.description}>
                          {p.description ? `${p.description.slice(0, 70)}${p.description.length > 70 ? '…' : ''}` : 'Sản phẩm chất lượng cao'}
                        </p>
                        <div className={cx('price-section')}>
                          {discountPercent ? (
                            <>
                              <span className={cx('old-price')}>
                                {formatPrice(originalPrice)}
                              </span>
                              <span className={cx('price')}>{formatPrice(p.price)}</span>
                              <span className={cx('discount')}>
                                -{discountPercent}%
                              </span>
                            </>
                          ) : (
                            <span className={cx('price')}>{formatPrice(p.price)}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          <button
            className={cx('arrow', 'right')}
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            aria-label="Next products"
          >
            &#10095;
          </button>
        </div>

        <div className={cx('controls')}>
          <Link to="/promo" className={cx('viewAll')} onClick={() => scrollToTop()}>
            Xem tất cả
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HotPromotions;

