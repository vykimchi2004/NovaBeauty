import React, { useEffect, useState, useMemo } from 'react';
import classNames from 'classnames/bind';
import styles from '../Categories/Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import { Link } from 'react-router-dom';
import { scrollToTop } from '~/services/utils';
import { getActiveProducts } from '~/services/product';

const cx = classNames.bind(styles);

// Định nghĩa các khoảng giá
const PRICE_RANGES = [
  { id: 'under-500k', label: 'Dưới 500.000₫', min: 0, max: 500000 },
  { id: '500k-1m', label: '500.000₫ - 1.000.000₫', min: 500000, max: 1000000 },
  { id: '1m-1.5m', label: '1.000.000₫ - 1.500.000₫', min: 1000000, max: 1500000 },
  { id: '1.5m-2m', label: '1.500.000₫ - 2.000.000₫', min: 1500000, max: 2000000 },
  { id: 'over-2m', label: 'Trên 2.000.000₫', min: 2000000, max: Infinity },
];

function BestSellers() {
  const [allProducts, setAllProducts] = useState([]); // Tất cả products từ API
  const [products, setProducts] = useState([]); // Products sau khi filter
  const [loading, setLoading] = useState(true);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]); // Các price ranges được chọn
  const [selectedBrands, setSelectedBrands] = useState([]); // Các brands được chọn
  const [brandSearchTerm, setBrandSearchTerm] = useState(''); // Từ khóa tìm kiếm brand

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getActiveProducts();
        
        // Sắp xếp products theo quantitySold (giảm dần) để lấy best sellers
        // Nếu quantitySold bằng null hoặc 0, sắp xếp theo createdAt (mới nhất)
        const sortedProducts = (data || []).sort((a, b) => {
          const aSold = a.quantitySold || 0;
          const bSold = b.quantitySold || 0;
          
          // Ưu tiên sắp xếp theo quantitySold
          if (aSold !== bSold) {
            return bSold - aSold; // Giảm dần
          }
          
          // Nếu quantitySold bằng nhau, sắp xếp theo createdAt (mới nhất trước)
          const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return bDate - aDate;
        });
        
        setAllProducts(sortedProducts);
      } catch (error) {
        console.error('Error fetching best sellers:', error);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Lấy danh sách unique brands từ products
  const availableBrands = useMemo(() => {
    const brands = allProducts
      .map(p => p.brand)
      .filter(brand => brand && brand.trim() !== '') // Lọc bỏ null, undefined, và empty string
      .filter((brand, index, self) => self.indexOf(brand) === index) // Lấy unique
      .sort(); // Sắp xếp theo alphabet
    return brands;
  }, [allProducts]);

  // Filter products theo price ranges và brands được chọn
  useEffect(() => {
    let filtered = [...allProducts];

    // Filter theo price ranges
    if (selectedPriceRanges.length > 0) {
      filtered = filtered.filter(product => {
        const productPrice = product.unitPrice || product.price || 0;
        
        return selectedPriceRanges.some(rangeId => {
          const range = PRICE_RANGES.find(r => r.id === rangeId);
          if (!range) return false;
          
          if (range.max === Infinity) {
            return productPrice >= range.min;
          } else {
            return productPrice >= range.min && productPrice < range.max;
          }
        });
      });
    }

    // Filter theo brands (AND logic với price filter)
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => {
        const productBrand = product.brand || '';
        return selectedBrands.includes(productBrand);
      });
    }

    setProducts(filtered);
  }, [allProducts, selectedPriceRanges, selectedBrands]);

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

  // Tính % giảm giá giống trang danh mục / tất cả sản phẩm
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
    <div className={cx('makeup-page')}>
      {/* Sidebar filters */}
      <aside className={cx('sidebar')}>
        <h2 className={cx('filter-title')}>BỘ LỌC</h2>

        {/* Nhóm lọc giá */}
        <div className={cx('filter-group')}>
          <h3>• Giá sản phẩm</h3>
          <ul>
            {PRICE_RANGES.map((range) => (
              <li key={range.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedPriceRanges.includes(range.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPriceRanges([...selectedPriceRanges, range.id]);
                      } else {
                        setSelectedPriceRanges(selectedPriceRanges.filter(id => id !== range.id));
                      }
                    }}
                  />
                  {range.label}
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* Nhóm lọc thương hiệu */}
        {availableBrands.length > 0 && (
          <div className={cx('filter-group')}>
            <h3>Thương hiệu</h3>
            <input
              type="text"
              className={cx('filter-search')}
              placeholder="Tìm thương hiệu"
              value={brandSearchTerm}
              onChange={(e) => setBrandSearchTerm(e.target.value)}
            />
            <ul>
              {availableBrands
                .filter(brand =>
                  brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
                )
                .map((brand) => (
                  <li key={brand}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBrands([...selectedBrands, brand]);
                          } else {
                            setSelectedBrands(selectedBrands.filter(b => b !== brand));
                          }
                        }}
                      />
                      {brand}
                    </label>
                  </li>
                ))}
            </ul>
            {availableBrands.filter(brand =>
              brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
            ).length === 0 && brandSearchTerm && (
              <div style={{ padding: '8px', color: '#999', fontSize: '14px' }}>
                Không tìm thấy thương hiệu
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Content */}
      <div className={cx('content')}>
        <h1 className={cx('title')}>Top sản phẩm bán chạy</h1>
        {loading ? (
          <div className={cx('loading')}>Đang tải sản phẩm...</div>
        ) : products.length === 0 ? (
          <div className={cx('empty')}>Chưa có sản phẩm nào</div>
        ) : (
          <div className={cx('product-grid')}>
            {products.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className={cx('product-card')} onClick={() => scrollToTop()}>
                <div className={cx('img-wrap')}>
                  <img
                    src={getProductImage(p)}
                    alt={p.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = image1;
                    }}
                  />
                  <span className={cx('freeship')}>FREESHIP</span>
                </div>
                <div className={cx('info')}>
                  <h4>{p.name}</h4>
                  <p className={cx('desc')}>{p.description || 'Sản phẩm chất lượng cao'}</p>
                  <div className={cx('price-section')}>
                    {(() => {
                      const discountPercent = calculateDiscountPercentage(p);
                      if (!discountPercent) {
                        return <span className={cx('price')}>{formatPrice(p.price)}</span>;
                      }
                      const originalPrice = (p.price || 0) + (p.discountValue || 0);
                      return (
                        <>
                          <span className={cx('old-price')}>{formatPrice(originalPrice)}</span>
                          <span className={cx('price')}>{formatPrice(p.price)}</span>
                          <span className={cx('discount')}>-{discountPercent}%</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BestSellers;


