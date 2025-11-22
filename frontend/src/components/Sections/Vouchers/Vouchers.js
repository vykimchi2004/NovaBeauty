import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Vouchers.module.scss';
import voucher1 from '../../../assets/images/vouchers/voucher1.png';
import voucher2 from '../../../assets/images/vouchers/voucher2.png';
import voucher3 from '../../../assets/images/vouchers/voucher3.png';
import { getActivePromotions } from '~/services/promotion';
import { getActiveVouchers } from '~/services/voucher';

const cx = classNames.bind(styles);
const PLACEHOLDER_IMAGES = [voucher1, voucher2, voucher3];

const buildProductLink = (promo) => {
  if (!promo?.code) return '/products';
  return { pathname: '/products', search: `?promo=${promo.code}` };
};

const getImage = (promo, index) => promo?.imageUrl || PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];

function Banner() {
  const [current, setCurrent] = useState(0);
  const [approvedPromos, setApprovedPromos] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[Vouchers] Starting to fetch vouchers and promotions...');
        console.log('[Vouchers] API endpoints:', {
          vouchers: '/vouchers/active',
          promotions: '/promotions/active',
          baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/nova_beauty'
        });
        
        // Lấy cả vouchers và promotions đã được duyệt và đang active
        let vouchersResponse = null;
        let promotionsResponse = null;
        
        try {
          vouchersResponse = await getActiveVouchers();
          console.log('[Vouchers] Vouchers API call successful');
        } catch (err) {
          console.error('[Vouchers] Error fetching vouchers:', err);
          console.error('[Vouchers] Voucher error details:', {
            message: err.message,
            status: err.status,
            code: err.code,
            response: err.response
          });
        }
        
        try {
          promotionsResponse = await getActivePromotions();
          console.log('[Vouchers] Promotions API call successful');
        } catch (err) {
          console.error('[Vouchers] Error fetching promotions:', err);
          console.error('[Vouchers] Promotion error details:', {
            message: err.message,
            status: err.status,
            code: err.code,
            response: err.response
          });
        }
        
        console.log('[Vouchers] Raw responses:', {
          vouchersResponse,
          promotionsResponse,
          vouchersType: typeof vouchersResponse,
          promotionsType: typeof promotionsResponse,
        });
        
        if (mounted) {
          // Xử lý response - có thể là array trực tiếp hoặc object có result property
          let vouchersData = [];
          let promotionsData = [];
          
          if (vouchersResponse) {
            if (Array.isArray(vouchersResponse)) {
              vouchersData = vouchersResponse;
            } else if (vouchersResponse.result && Array.isArray(vouchersResponse.result)) {
              vouchersData = vouchersResponse.result;
            } else if (vouchersResponse.data && Array.isArray(vouchersResponse.data)) {
              vouchersData = vouchersResponse.data;
            }
          }
          
          if (promotionsResponse) {
            if (Array.isArray(promotionsResponse)) {
              promotionsData = promotionsResponse;
            } else if (promotionsResponse.result && Array.isArray(promotionsResponse.result)) {
              promotionsData = promotionsResponse.result;
            } else if (promotionsResponse.data && Array.isArray(promotionsResponse.data)) {
              promotionsData = promotionsResponse.data;
            }
          }
          
          console.log('[Vouchers] Processed data:', {
            vouchersCount: vouchersData.length,
            promotionsCount: promotionsData.length,
            sampleVoucher: vouchersData[0],
            samplePromotion: promotionsData[0],
          });
          
          // Kết hợp vouchers và promotions
          const allItems = [...vouchersData, ...promotionsData];
          
          // Filter: chỉ lấy những item đã được duyệt (status = APPROVED), đang active
          // Backend đã filter APPROVED và isActive rồi, nhưng kiểm tra lại để chắc chắn
          // imageUrl có thể null, sẽ dùng placeholder image
          const filtered = allItems.filter((item) => {
            if (!item || !item.id) {
              console.log('[Vouchers] Filtered out invalid item:', item);
              return false;
            }
            
            // Backend đã filter APPROVED và isActive, nhưng kiểm tra lại
            const hasStatus = item.status === 'APPROVED';
            const isActive = item.isActive === true || item.isActive === null; // null có thể là true
            
            if (!hasStatus || !isActive) {
              console.log('[Vouchers] Filtered out item (status/active):', {
                id: item.id,
                code: item.code,
                name: item.name,
                status: item.status,
                isActive: item.isActive,
              });
              return false;
            }
            
            return true;
          });
          
          // Nếu không có item nào có imageUrl, vẫn hiển thị với placeholder
          // Nhưng ưu tiên những item có imageUrl
          const withImage = filtered.filter(item => !!item.imageUrl);
          const withoutImage = filtered.filter(item => !item.imageUrl);
          
          // Sắp xếp: items có imageUrl trước, sau đó là items không có imageUrl
          const sorted = [...withImage, ...withoutImage];
          
          console.log('[Vouchers] Filtered and sorted:', {
            total: allItems.length,
            filtered: filtered.length,
            withImage: withImage.length,
            withoutImage: withoutImage.length,
            final: sorted.length,
          });
          
          console.log('[Vouchers] Final filtered items:', {
            total: allItems.length,
            filtered: filtered.length,
            items: filtered.map(item => ({
              id: item.id,
              code: item.code,
              name: item.name,
              imageUrl: item.imageUrl,
            })),
          });
          
          setApprovedPromos(sorted);
        }
      } catch (error) {
        console.error('[Vouchers] load approved promotions error:', error);
        console.error('[Vouchers] Error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response,
        });
        if (mounted) {
          setApprovedPromos([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const slides = approvedPromos.length > 0 ? approvedPromos : PLACEHOLDER_IMAGES.map((img, idx) => ({ imageUrl: img, _placeholder: true, id: `placeholder-${idx}` }));
  const sideBanners = slides.slice(1, 3);

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className={cx('container')} aria-labelledby="banners-heading">
      <div className={cx('inner')}>
        <div className={cx('voucherWrapper')}>
          <div className={cx('voucher-slider')}>
            {slides.map((slide, index) => (
              <div className={index === current ? cx('slide', 'active') : cx('slide')} key={slide.id || index}>
                {index === current && (
                  <Link to={buildProductLink(slide)} className={cx('slide-link')}>
                    <img src={getImage(slide, index)} alt={`voucher-banner-${index}`} />
                  </Link>
                )}
              </div>
            ))}

            {slides.length > 1 && (
              <>
                <button className={cx('prev')} onClick={handlePrev} aria-label="Previous slide">
                  &#10094;
                </button>
                <button className={cx('next')} onClick={handleNext} aria-label="Next slide">
                  &#10095;
                </button>
                <div className={cx('dots')}>
                  {slides.map((_, index) => (
                    <span
                      key={index}
                      className={index === current ? cx('dot', 'active') : cx('dot')}
                      onClick={() => setCurrent(index)}
                      role="button"
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className={cx('rightBanners')}>
            {sideBanners.length ? (
              sideBanners.map((banner, index) => (
                <Link to={buildProductLink(banner)} className={cx('sideBanner')} aria-label={`right-banner-${index}`} key={banner.id || `side-${index}`}>
                  <img src={getImage(banner, index + 1)} alt={`banner-right-${index + 1}`} />
                </Link>
              ))
            ) : (
              <>
                <Link to="/products" className={cx('sideBanner')} aria-label="right-banner-top">
                  <img src={voucher2} alt="banner-right-1" />
                </Link>
                <Link to="/products" className={cx('sideBanner')} aria-label="right-banner-bottom">
                  <img src={voucher3} alt="banner-right-2" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Banner;
