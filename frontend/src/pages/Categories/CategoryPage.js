import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import { scrollToTop } from '~/services/utils';
import { getActiveCategories, getSubCategories } from '~/services/category';
import { getProductsByCategory } from '~/services/product';

const cx = classNames.bind(styles);

// Mapping từ route path sang category name/ID
const CATEGORY_MAPPING = {
  'makeup': { names: ['trang điểm', 'makeup'], id: 'MAKEUP' },
  'skincare': { names: ['chăm sóc da', 'skincare'], id: 'SKINCARE' },
  'perfume': { names: ['nước hoa', 'perfume'], id: 'PERFUME' },
  'personal-care': { names: ['chăm sóc cá nhân', 'personal care'], id: 'PERSONAL_CARE' },
  'haircare': { names: ['chăm sóc tóc', 'haircare', 'hair care'], id: 'HAIRCARE' },
  'accessories': { names: ['phụ kiện', 'accessories'], id: 'ACCESSORIES' },
};

function CategoryPage() {
  const location = useLocation();
  const categoryPath = location.pathname.replace('/', '') || 'makeup'; // Lấy path từ URL
  const [category, setCategory] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [error, setError] = useState(null);

  // Hàm load tất cả products từ category chính + subcategories
  // Backend đã tự động bao gồm products từ subcategories khi gọi với parent category ID
  const loadAllCategoryProducts = useCallback(async (categoryId, subCategories) => {
    try {
      console.log('[CategoryPage] loadAllCategoryProducts called with:', { categoryId, subCategoriesCount: subCategories?.length || 0 });
      
      // Backend đã tự động bao gồm products từ subcategories khi gọi với parent category ID
      console.log('[CategoryPage] Loading products from category (including subcategories):', categoryId);
      const categoryProducts = await getProductsByCategory(categoryId);
      console.log('[CategoryPage] Category products response:', categoryProducts);
      
      let allProducts = [];
      if (Array.isArray(categoryProducts)) {
        allProducts = categoryProducts;
      } else if (categoryProducts && Array.isArray(categoryProducts.result)) {
        allProducts = categoryProducts.result;
      }
      
      // Filter chỉ lấy products hợp lệ (backend đã filter APPROVED rồi)
      const validProducts = allProducts.filter(p => {
        if (!p || !p.id) {
          console.warn('[CategoryPage] Invalid product:', p);
          return false;
        }
        return true;
      });
      
      console.log('[CategoryPage] Products loaded (including subcategories):', validProducts.length, validProducts.map(p => ({ id: p.id, name: p.name, categoryId: p.categoryId, categoryName: p.categoryName })));
      return validProducts;
    } catch (error) {
      console.error('[CategoryPage] Error loading all category products:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('[CategoryPage] Loading data for path:', categoryPath);
        
        const allCategories = await getActiveCategories();
        console.log('[CategoryPage] All categories loaded:', allCategories?.length || 0, allCategories);
        
        // Tìm category dựa trên route path
        const mapping = CATEGORY_MAPPING[categoryPath];
        console.log('[CategoryPage] Category mapping:', mapping);
        
        const foundCategory = allCategories?.find(cat => {
          if (!cat) return false;
          if (mapping?.id && cat.id === mapping.id) return true;
          if (mapping?.names) {
            const catName = cat.name?.toLowerCase() || '';
            return mapping.names.some(name => catName.includes(name));
          }
          return false;
        });

        console.log('[CategoryPage] Found category:', foundCategory);

        if (foundCategory) {
          // Lấy subcategories
          const subs = await getSubCategories(foundCategory.id);
          console.log('[CategoryPage] Raw subcategories response:', subs);
          
          // Xử lý response - có thể là array hoặc object có result
          let subCategoriesList = [];
          if (Array.isArray(subs)) {
            subCategoriesList = subs;
          } else if (subs && Array.isArray(subs.result)) {
            subCategoriesList = subs.result;
          } else if (foundCategory.subCategories && Array.isArray(foundCategory.subCategories)) {
            subCategoriesList = foundCategory.subCategories;
          }
          
          console.log('[CategoryPage] Subcategories loaded:', subCategoriesList.length, subCategoriesList.map(s => ({ id: s.id, name: s.name, productCount: s.productCount })));
          
          // Reset selectedSubCategory khi load category mới
          setSelectedSubCategory(null);
          
          // Set category và subcategories trước
          setCategory(foundCategory);
          setSubCategories(subCategoriesList);
          
          // Load products ngay sau khi set category và subcategories
          // Đảm bảo products được load ngay lập tức (bao gồm cả subcategories)
          try {
            setLoading(true);
            const allProducts = await loadAllCategoryProducts(foundCategory.id, subCategoriesList);
            console.log('[CategoryPage] Initial products loaded (including subcategories):', allProducts.length);
            if (allProducts.length === 0) {
              console.warn('[CategoryPage] No products found! Check if products exist in category and subcategories.');
              console.warn('[CategoryPage] Category ID:', foundCategory.id);
              console.warn('[CategoryPage] Subcategories:', subCategoriesList.map(s => ({ id: s.id, name: s.name })));
            }
            setProducts(allProducts);
          } catch (error) {
            console.error('[CategoryPage] Error loading initial products:', error);
            setProducts([]);
          } finally {
            setLoading(false);
          }
        } else {
          console.warn(`[CategoryPage] Category not found for path: ${categoryPath}`);
          console.warn('[CategoryPage] Available categories:', allCategories?.map(c => ({ id: c.id, name: c.name })));
          setProducts([]);
          setSubCategories([]);
        }
      } catch (error) {
        console.error('[CategoryPage] Error loading category:', error);
        console.error('[CategoryPage] Error message:', error.message);
        console.error('[CategoryPage] Error stack:', error.stack);
        if (error.response) {
          console.error('[CategoryPage] Error response:', error.response);
        }
        setError(error.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
        setProducts([]);
        setSubCategories([]);
      } finally {
        setLoading(false);
      }
    };

    if (categoryPath) {
      loadData();
    }
  }, [categoryPath]);

  // Load products khi chọn subcategory hoặc category thay đổi
  useEffect(() => {
    const loadProducts = async () => {
      if (!category) {
        console.log('[CategoryPage] No category, skipping product load');
        return;
      }
      
      // Chỉ load nếu subCategories đã được set (không phải null hoặc undefined)
      if (subCategories === null || subCategories === undefined) {
        console.log('[CategoryPage] SubCategories not ready yet, skipping product load');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        if (selectedSubCategory) {
          // Nếu chọn subcategory, chỉ load products của subcategory đó
          console.log('[CategoryPage] Loading products for subcategory:', selectedSubCategory);
          const fetchedProducts = await getProductsByCategory(selectedSubCategory);
          console.log('[CategoryPage] Subcategory products raw response:', fetchedProducts);
          
          let productsList = [];
          if (Array.isArray(fetchedProducts)) {
            productsList = fetchedProducts;
          } else if (fetchedProducts && Array.isArray(fetchedProducts.result)) {
            productsList = fetchedProducts.result;
          }
          
          // Backend đã filter APPROVED rồi, chỉ cần check id
          productsList = productsList.filter(p => p && p.id);
          console.log('[CategoryPage] Subcategory products loaded:', productsList.length, productsList.map(p => ({ id: p.id, name: p.name })));
          setProducts(productsList);
        } else {
          // Nếu không chọn subcategory, load tất cả products từ category chính + subcategories
          console.log('[CategoryPage] Loading all products for category:', category.id, 'with', subCategories.length, 'subcategories');
          if (subCategories.length === 0) {
            console.log('[CategoryPage] No subcategories, loading only from main category');
          }
          const allProducts = await loadAllCategoryProducts(category.id, subCategories);
          console.log('[CategoryPage] All category products loaded:', allProducts.length);
          if (allProducts.length === 0) {
            console.warn('[CategoryPage] No products found! Check if products exist in database.');
            console.warn('[CategoryPage] Category ID:', category.id);
            console.warn('[CategoryPage] Subcategories:', subCategories.map(s => ({ id: s.id, name: s.name })));
          } else {
            console.log('[CategoryPage] Products loaded successfully:', allProducts.map(p => ({ id: p.id, name: p.name, categoryId: p.categoryId, categoryName: p.categoryName })));
          }
          setProducts(allProducts);
        }
      } catch (error) {
        console.error('[CategoryPage] Error loading products:', error);
        console.error('[CategoryPage] Error details:', error.message, error.response);
        setError(error.message || 'Không thể tải sản phẩm. Vui lòng thử lại.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    // Chỉ load khi category và subCategories đã được set
    if (category && subCategories !== null && subCategories !== undefined) {
      console.log('[CategoryPage] useEffect triggered, category:', category.id, 'selectedSubCategory:', selectedSubCategory, 'subCategories:', subCategories.length);
      loadProducts();
    } else {
      console.log('[CategoryPage] useEffect triggered but category or subCategories not ready yet', { category: !!category, subCategories: subCategories });
    }
  }, [selectedSubCategory, category, subCategories, loadAllCategoryProducts]);

  const handleSubCategoryClick = (subCategoryId) => {
    if (selectedSubCategory === subCategoryId) {
      // Nếu click lại subcategory đã chọn, reset về "Tất cả"
      setSelectedSubCategory(null);
    } else {
      setSelectedSubCategory(subCategoryId);
    }
  };

  const getProductImage = (product) => {
    if (product.defaultMediaUrl) return product.defaultMediaUrl;
    if (product.mediaUrls && product.mediaUrls.length > 0) return product.mediaUrls[0];
    return image1;
  };

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
      {/* --- Cột bên trái: Bộ lọc --- */}
      <aside className={cx('sidebar')}>
        <h2 className={cx('filter-title')}>BỘ LỌC</h2>

        {/* Nhóm lọc giá */}
        <div className={cx('filter-group')}>
          <h3>Giá sản phẩm</h3>
          <ul>
            <li>
              <label>
                <input type="checkbox" /> Dưới 500.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> 500.000đ - 1.000.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> 1.000.000đ - 1.500.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> 1.500.000đ - 2.000.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Trên 2.000.000đ
              </label>
            </li>
          </ul>
        </div>

        {/* Nhóm lọc loại sản phẩm */}
        <div className={cx('filter-group')}>
          <h3>Loại sản phẩm</h3>
          <input type="text" className={cx('filter-search')} placeholder="Tìm" />
          <ul>
            {subCategories.slice(0, 5).map((sub) => (
              <li key={sub.id}>
                <label>
                  <input type="checkbox" /> {sub.name} {sub.productCount ? `(${sub.productCount})` : ''}
                </label>
              </li>
            ))}
          </ul>
          {subCategories.length > 5 && (
            <button className={cx('see-more')}>Xem thêm</button>
          )}
        </div>
      </aside>

      {/* --- Cột bên phải: Sản phẩm --- */}
      <div className={cx('content')}>
        <h1 className={cx('title')}>{category?.name || 'Danh mục'}</h1>

        {/* Hiển thị subcategories */}
        {subCategories && subCategories.length > 0 && (
          <div className={cx('subcategories')}>
            <button
              className={cx('subcategory-btn', { active: !selectedSubCategory })}
              onClick={() => handleSubCategoryClick(null)}
            >
              Tất cả
            </button>
            {subCategories.map((sub) => (
              <button
                key={sub.id}
                className={cx('subcategory-btn', { active: selectedSubCategory === sub.id })}
                onClick={() => handleSubCategoryClick(sub.id)}
              >
                {sub.name} {sub.productCount ? `(${sub.productCount})` : ''}
              </button>
            ))}
          </div>
        )}

        {error ? (
          <div className={cx('error')}>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className={cx('retry-btn')}>
              Thử lại
            </button>
          </div>
        ) : loading ? (
          <div className={cx('loading')}>Đang tải sản phẩm...</div>
        ) : products.length === 0 ? (
          <div className={cx('empty')}>
            {category ? 'Chưa có sản phẩm nào' : 'Đang tải danh mục...'}
          </div>
        ) : (
          <div className={cx('product-grid')}>
            {products.map((p) => {
              const discountPercent = calculateDiscountPercentage(p);
              const originalPrice = discountPercent ? (p.price || 0) + (p.discountValue || 0) : null;
              
              return (
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
                      {discountPercent && originalPrice ? (
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

export default CategoryPage;

