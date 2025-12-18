import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Products.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import { Link } from 'react-router-dom';
import { scrollToTop } from '~/services/utils';
import { useProducts, useCategories } from '~/hooks';

const cx = classNames.bind(styles);

// Định nghĩa các khoảng giá
const PRICE_RANGES = [
  { id: 'under-500k', label: 'Dưới 500.000₫', min: 0, max: 500000 },
  { id: '500k-1m', label: '500.000₫ - 1.000.000₫', min: 500000, max: 1000000 },
  { id: '1m-1.5m', label: '1.000.000₫ - 1.500.000₫', min: 1000000, max: 1500000 },
  { id: '1.5m-2m', label: '1.500.000₫ - 2.000.000₫', min: 1500000, max: 2000000 },
  { id: 'over-2m', label: 'Trên 2.000.000₫', min: 2000000, max: Infinity },
];

function Products() {
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('category');
  const brandParam = searchParams.get('brand');
  const headingParam = searchParams.get('heading');
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]); // Các price ranges được chọn
  const [selectedBrands, setSelectedBrands] = useState(() => (brandParam ? [brandParam] : [])); // Các brands được chọn
  const [brandSearchTerm, setBrandSearchTerm] = useState(''); // Từ khóa tìm kiếm brand
  const [sortBy, setSortBy] = useState('best_selling'); // State sắp xếp
  const brandParamRef = useRef(brandParam);

  // Use hooks
  const { products: allProducts, loading: productsLoading } = useProducts({
    categoryId,
    autoLoad: true,
  });
  const { categories, loading: categoriesLoading } = useCategories({
    type: 'all',
    autoLoad: true,
    filterInactive: false, // Show all for filter
  });

  const loading = productsLoading || categoriesLoading;

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
  const products = useMemo(() => {
    let filtered = [...allProducts];

    // Filter theo price ranges
    if (selectedPriceRanges.length > 0) {
      filtered = filtered.filter(product => {
        const productPrice = product.price || 0; // Dùng price (đã bao gồm VAT)

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

    // Sorting Logic - luôn sort lại toàn bộ danh sách khi thay đổi sortBy
    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'best_selling') {
      // Sắp xếp theo số lượng đã bán (quantitySold)
      filtered.sort((a, b) => (b.quantitySold || 0) - (a.quantitySold || 0));
    }

    return filtered;
  }, [allProducts, selectedPriceRanges, selectedBrands, sortBy]);

  useEffect(() => {
    if (brandParamRef.current === brandParam) return;
    brandParamRef.current = brandParam;
    setSelectedBrands(brandParam ? [brandParam] : []);
  }, [brandParam]);

  const formatPrice = (price) => {
    const safePrice = Number(price) || 0;
    return (
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(safePrice) + ' ₫'
    );
  };

  const selectedCategoryName = useMemo(() => {
    if (!categoryId) return null;
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || null;
  }, [categories, categoryId]);

  const primaryBrand = useMemo(() => {
    if (brandParam) return brandParam;
    if (selectedBrands.length === 1) return selectedBrands[0];
    return null;
  }, [brandParam, selectedBrands]);

  const pageTitle = useMemo(() => {
    if (headingParam) return headingParam;
    if (selectedCategoryName && primaryBrand) {
      return `${selectedCategoryName} • ${primaryBrand}`;
    }
    if (selectedCategoryName) return selectedCategoryName;
    if (primaryBrand) return `Thương hiệu: ${primaryBrand}`;
    return 'Tất cả sản phẩm';
  }, [selectedCategoryName, primaryBrand]);

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
    return image1;
  };

  return (
    <div className={cx('products-page')}>
      {/* Sidebar filters */}
      <aside className={cx('sidebar')}>
        <h2 className={cx('filter-title')}>BỘ LỌC</h2>

        {/* Nhóm lọc danh mục - chỉ hiển thị khi không có category được chọn */}
        {!categoryId && (
          <div className={cx('filter-group')}>
            <h3>Danh mục</h3>
            <ul>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={!categoryId}
                    onChange={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('category');
                      window.location.search = newParams.toString();
                    }}
                  /> Tất cả
                </label>
              </li>
              {categories
                .filter(cat => cat.status !== false && !cat.parentId)
                .map((category) => (
                  <li key={category.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={categoryId === category.id}
                        onChange={() => {
                          const newParams = new URLSearchParams(searchParams);
                          if (categoryId === category.id) {
                            newParams.delete('category');
                          } else {
                            newParams.set('category', category.id);
                          }
                          window.location.search = newParams.toString();
                        }}
                      /> {category.name}
                    </label>
                  </li>
                ))}
            </ul>
          </div>
        )}

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
                        // Thêm range vào danh sách được chọn
                        setSelectedPriceRanges([...selectedPriceRanges, range.id]);
                      } else {
                        // Xóa range khỏi danh sách được chọn
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
      {/* Content: all products grid */}
      <div className={cx('content')}>
        <div className={cx('header-row')}>
          <h1 className={cx('title')}>{pageTitle}</h1>
          <div className={cx('sort-options')}>
            <span>Sắp xếp:</span>
            <select
              className={cx('sort-select')}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="best_selling">Bán chạy nhất</option>
              <option value="price_desc">Giá cao nhất</option>
              <option value="price_asc">Giá thấp nhất</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className={cx('loading')}>Đang tải sản phẩm...</div>
        ) : products.length === 0 ? (
          <div className={cx('empty')}>Chưa có sản phẩm nào</div>
        ) : (
          <div className={cx('product-grid')}>
            {products.map((p, index) => (
              <Link
                key={p.id}
                to={`/product/${p.id}`}
                className={cx('product-card')}
                onClick={() => scrollToTop()}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className={cx('img-wrap')}>
                  <img
                    src={getProductImage(p)}
                    alt={p.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = image1;
                    }}
                  />
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
                          <span className={cx('old-price')}>
                            {formatPrice(originalPrice)}
                          </span>
                          <span className={cx('price')}>{formatPrice(p.price)}</span>
                          <span className={cx('discount')}>
                            -{discountPercent}%
                          </span>
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

export default Products;
