import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './StaffProducts.module.scss';
import { getMyProducts, createProduct, updateProduct, deleteProduct } from '~/services/product';
import { getCategories, getRootCategories, getSubCategories } from '~/services/category';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

function StaffProducts() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    detailedDescription: '',
    brand: '',
    price: '',
    categoryId: '',
    weight: '',
    ingredients: '',
    uses: '',
    usageInstructions: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    
    // Listen for category updates
    const handleCategoriesUpdated = () => {
      fetchCategories();
    };
    window.addEventListener('categoriesUpdated', handleCategoriesUpdated);
    
    return () => {
      window.removeEventListener('categoriesUpdated', handleCategoriesUpdated);
    };
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getMyProducts();
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      notify.error('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const rootData = await getRootCategories();
      const activeRootCategories = (rootData || []).filter(cat => cat.status !== false);
      const allCategories = [...activeRootCategories];

      for (const rootCat of activeRootCategories) {
        try {
          const subCats = await getSubCategories(rootCat.id);
          const activeSubCats = (subCats || []).filter(cat => cat.status !== false);
          allCategories.push(...activeSubCats);
        } catch (subErr) {
          console.warn(`Error fetching subcategories for ${rootCat.id}:`, subErr);
        }
      }

      setCategories(allCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      try {
        const allData = await getCategories();
        const activeData = (allData || []).filter(cat => cat.status !== false);
        setCategories(activeData);
      } catch (fallbackErr) {
        console.error('Error fetching all categories:', fallbackErr);
        setCategories([]);
      }
    } finally {
      setLoadingCategories(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(term) ||
        product.id?.toLowerCase().includes(term)
      );
    }
    setFilteredProducts(filtered);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      detailedDescription: '',
      brand: '',
      price: '',
      categoryId: '',
      weight: '',
      ingredients: '',
      uses: '',
      usageInstructions: ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      detailedDescription: product.detailedDescription || '',
      brand: product.brand || '',
      price: product.price?.toString() || '',
      categoryId: product.categoryId || product.category?.id || '',
      weight: product.weight?.toString() || '',
      ingredients: product.ingredients || '',
      uses: product.uses || '',
      usageInstructions: product.usageInstructions || ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      detailedDescription: '',
      brand: '',
      price: '',
      categoryId: '',
      weight: '',
      ingredients: '',
      uses: '',
      usageInstructions: ''
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Tên sản phẩm không được để trống';
    if (!formData.price || parseFloat(formData.price) <= 0) {
      errors.price = 'Giá sản phẩm phải lớn hơn 0';
    }
    if (!formData.categoryId) errors.categoryId = 'Vui lòng chọn danh mục';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        detailedDescription: formData.detailedDescription?.trim() || null,
        brand: formData.brand?.trim() || null,
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        ingredients: formData.ingredients?.trim() || null,
        uses: formData.uses?.trim() || null,
        usageInstructions: formData.usageInstructions?.trim() || null
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, submitData);
        notify.success('Cập nhật sản phẩm thành công!');
      } else {
        await createProduct(submitData);
        notify.success('Thêm sản phẩm thành công!');
      }

      handleCloseModal();
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      notify.error(err.message || 'Không thể lưu sản phẩm. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (productId) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc chắn muốn xóa sản phẩm này?',
      'Xác nhận xóa sản phẩm',
      'Xóa',
      'Hủy'
    );
    
    if (!confirmed) return;

    try {
      await deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
      notify.success('Xóa sản phẩm thành công!');
    } catch (err) {
      console.error('Error deleting product:', err);
      notify.error('Không thể xóa sản phẩm. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className={cx('wrapper')}>
        <div className={cx('loading')}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className={cx('wrapper')}>
      <div className={cx('header')}>
        <h2 className={cx('title')}>Quản lý sản phẩm</h2>
        <div className={cx('headerActions')}>
          <div className={cx('searchBox')}>
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cx('searchInput')}
            />
            <button type="button" className={cx('searchBtn')}>
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </div>
          <button type="button" className={cx('addBtn')} onClick={handleAdd}>
            <FontAwesomeIcon icon={faPlus} />
            Thêm sản phẩm
          </button>
        </div>
      </div>

      <div className={cx('tableWrapper')}>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên sản phẩm</th>
              <th>Thương hiệu</th>
              <th>Giá</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="6" className={cx('empty')}>
                  Không có sản phẩm nào
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className={cx('idCell')}>{product.id}</td>
                  <td>
                    <div className={cx('productName')}>{product.name}</div>
                  </td>
                  <td>{product.brand || '-'}</td>
                  <td className={cx('priceCell')}>
                    {product.price?.toLocaleString('vi-VN')} đ
                  </td>
                  <td>
                    <span className={cx('statusBadge', product.status?.toLowerCase() || 'default')}>
                      {product.status === 'ACTIVE' ? 'Đã duyệt' : 
                       product.status === 'PENDING' ? 'Chờ duyệt' : 
                       product.status === 'REJECTED' ? 'Từ chối' : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <div className={cx('actions')}>
                      <button
                        onClick={() => handleEdit(product)}
                        className={cx('actionBtn', 'editBtn')}
                        disabled={product.status === 'ACTIVE'}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                        Sửa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit Product */}
      {showModal && (
        <div className={cx('modalOverlay')} onClick={handleCloseModal}>
          <div className={cx('modalContent')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>{editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <button className={cx('closeBtn')} onClick={handleCloseModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className={cx('modalBody')}>
              <div className={cx('formGroup', { error: formErrors.name })}>
                <label>Tên sản phẩm *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên sản phẩm"
                />
                {formErrors.name && <span className={cx('errorText')}>{formErrors.name}</span>}
              </div>

              <div className={cx('formGroup', { error: formErrors.categoryId })}>
                <label>Danh mục *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">{loadingCategories ? 'Đang tải danh mục...' : 'Chọn danh mục'}</option>
                  {categories.length === 0 && !loadingCategories && (
                    <option value="" disabled>Không có danh mục nào</option>
                  )}
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {formErrors.categoryId && <span className={cx('errorText')}>{formErrors.categoryId}</span>}
              </div>

              <div className={cx('formGroup')}>
                <label>Thương hiệu</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Nhập thương hiệu"
                />
              </div>

              <div className={cx('formGroup', { error: formErrors.price })}>
                <label>Giá sản phẩm *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Nhập giá sản phẩm"
                />
                {formErrors.price && <span className={cx('errorText')}>{formErrors.price}</span>}
              </div>

              <div className={cx('formGroup')}>
                <label>Mô tả</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về sản phẩm"
                />
              </div>

              <div className={cx('formGroup')}>
                <label>Mô tả chi tiết</label>
                <textarea
                  rows="4"
                  value={formData.detailedDescription}
                  onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
                  placeholder="Mô tả chi tiết về sản phẩm"
                />
              </div>

              <div className={cx('formGroup')}>
                <label>Trọng lượng (gram)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="Nhập trọng lượng"
                />
              </div>

              <div className={cx('formGroup')}>
                <label>Thành phần</label>
                <textarea
                  rows="3"
                  value={formData.ingredients}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                  placeholder="Danh sách thành phần"
                />
              </div>

              <div className={cx('formGroup')}>
                <label>Công dụng</label>
                <textarea
                  rows="3"
                  value={formData.uses}
                  onChange={(e) => setFormData({ ...formData, uses: e.target.value })}
                  placeholder="Công dụng của sản phẩm"
                />
              </div>

              <div className={cx('formGroup')}>
                <label>Cách sử dụng</label>
                <textarea
                  rows="3"
                  value={formData.usageInstructions}
                  onChange={(e) => setFormData({ ...formData, usageInstructions: e.target.value })}
                  placeholder="Hướng dẫn sử dụng"
                />
              </div>

              <div className={cx('modalFooter')}>
                <button type="button" className={cx('cancelBtn')} onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className={cx('submitBtn')}>
                  {editingProduct ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffProducts;
