import React, { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUpload } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../../StaffVouchers.module.scss';

const cx = classNames.bind(styles);

function PromotionFormModal({
  open,
  mode,
  formData,
  formErrors,
  categories = [],
  products = [],
  previewUrl,
  uploadingImage,
  onClose,
  onChange,
  onSubmit,
  onScopeChange,
  onToggleCategory,
  onToggleProduct,
  onFileChange,
}) {
  const title = mode === 'edit' ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi';
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const toggleProductDropdown = () => setProductDropdownOpen((prev) => !prev);
  const previewLabel = useMemo(() => {
    if (formData.productIds.length === 0) return 'Chọn sản phẩm';
    return `Đã chọn ${formData.productIds.length} sản phẩm`;
  }, [formData.productIds.length]);

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products.slice(0, 50);
    const searchLower = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(searchLower)
    ).slice(0, 50);
  }, [products, productSearchTerm]);

  const selectedProducts = useMemo(() => {
    return products.filter(p => formData.productIds.includes(p.id));
  }, [products, formData.productIds]);

  if (!open) return null;

  return (
    <div className={cx('modalOverlay')} onClick={onClose}>
      <div className={cx('modalContent')} onClick={(e) => e.stopPropagation()}>
        <div className={cx('modalHeader')}>
          <h3>{title}</h3>
          <button type="button" className={cx('closeBtn')} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <form className={cx('modalBody')} onSubmit={onSubmit}>
          <div className={cx('formRow')}>
            <div className={cx('formGroup', { error: formErrors.name })}>
              <label>Tên khuyến mãi *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="Nhập tên khuyến mãi"
              />
              {formErrors.name && <span className={cx('errorText')}>{formErrors.name}</span>}
            </div>
            <div className={cx('formGroup', { error: formErrors.code })}>
              <label>Mã khuyến mãi *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => {
                  // Chỉ cho phép chữ hoa, số, dấu gạch ngang và gạch dưới
                  const sanitized = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9_-]/g, '');
                  onChange('code', sanitized);
                }}
                placeholder="VD: SALE50"
                disabled={mode === 'edit'}
                maxLength={50}
              />
              {formErrors.code && <span className={cx('errorText')}>{formErrors.code}</span>}
              <small className={cx('helperText')} style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Chỉ được nhập chữ hoa, số, dấu gạch ngang (-) và gạch dưới (_)
              </small>
            </div>
          </div>

          <div className={cx('formGroup', { error: formErrors.discountValue })}>
            <label>Giảm giá (%) *</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.discountValue}
              onChange={(e) => onChange('discountValue', e.target.value)}
              placeholder="Nhập phần trăm giảm giá"
            />
            {formErrors.discountValue && <span className={cx('errorText')}>{formErrors.discountValue}</span>}
          </div>

          <div className={cx('formRow')}>
            <div className={cx('formGroup', { error: formErrors.startDate })}>
              <label>Ngày bắt đầu *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => onChange('startDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              {formErrors.startDate && <span className={cx('errorText')}>{formErrors.startDate}</span>}
            </div>
            <div className={cx('formGroup', { error: formErrors.expiryDate })}>
              <label>Ngày kết thúc *</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => onChange('expiryDate', e.target.value)}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
              />
              {formErrors.expiryDate && <span className={cx('errorText')}>{formErrors.expiryDate}</span>}
            </div>
          </div>

          <div className={cx('formGroup')}>
            <label>Phạm vi áp dụng</label>
            <div className={cx('scopeToggle')}>
              <button
                type="button"
                className={cx({ active: formData.applyScope === 'CATEGORY' })}
                onClick={() => onScopeChange('CATEGORY')}
              >
                Danh mục
              </button>
              <button
                type="button"
                className={cx({ active: formData.applyScope === 'PRODUCT' })}
                onClick={() => onScopeChange('PRODUCT')}
              >
                Sản phẩm
              </button>
            </div>
          </div>

          <div className={cx('formGroup', { error: formErrors.imageUrl })}>
            <label>Hình ảnh</label>
            <div className={cx('mediaUpload')}>
              <div className={cx('preview')}>
                {previewUrl || formData.imageUrl ? (
                  <>
                    <img src={previewUrl || formData.imageUrl} alt="promotion" />
                    <button
                      type="button"
                      className={cx('removeMediaBtn')}
                      onClick={() => onFileChange(null)}
                      aria-label="Xóa ảnh"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  'Chưa có ảnh'
                )}
              </div>
              <label className={cx('uploadBtn')}>
                <FontAwesomeIcon icon={faUpload} />
                {uploadingImage ? 'Đang tải...' : previewUrl || formData.imageUrl ? 'Đổi ảnh' : 'Chọn ảnh'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                  disabled={uploadingImage}
                />
              </label>
            </div>
            {formErrors.imageUrl && <span className={cx('errorText')}>{formErrors.imageUrl}</span>}
          </div>

          {formData.applyScope === 'CATEGORY' && (
            <div className={cx('formGroup')}>
              <label>Danh mục áp dụng</label>
              <div className={cx('categoryGrid')}>
                {categories.slice(0, 30).map((cat) => {
                  const active = formData.categoryIds.includes(cat.id);
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      className={cx('categoryChip', { active })}
                      onClick={() => onToggleCategory(cat.id)}
                    >
                      {cat.name}
                    </button>
                  );
                })}
                {categories.length === 0 && <span className={cx('helperText')}>Không có danh mục.</span>}
              </div>
            </div>
          )}

          {formData.applyScope === 'PRODUCT' && (
            <div className={cx('formGroup')}>
              <label>Sản phẩm áp dụng</label>
              
              {/* Selected products display */}
              {selectedProducts.length > 0 && (
                <div className={cx('selectedProducts')}>
                  <div className={cx('selectedHeader')}>
                    <span>Đã chọn ({selectedProducts.length}):</span>
                  </div>
                  <div className={cx('selectedList')}>
                    {selectedProducts.map((prod) => (
                      <div key={prod.id} className={cx('selectedItem')}>
                        <span>{prod.name}</span>
                        <button
                          type="button"
                          className={cx('removeSelected')}
                          onClick={() => onToggleProduct(prod.id)}
                          aria-label="Xóa"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product selector */}
              <div className={cx('dropdownSelect', { open: productDropdownOpen })}>
                <button
                  type="button"
                  className={cx('dropdownToggle')}
                  onClick={toggleProductDropdown}
                >
                  <span className={cx('dropdownLabel')}>
                    {productDropdownOpen ? 'Đóng danh sách' : previewLabel}
                  </span>
                  <span className={cx('chevron', { open: productDropdownOpen })}>⌄</span>
                </button>
                {productDropdownOpen && (
                  <div className={cx('dropdownMenu')}>
                    {/* Search box */}
                    <div className={cx('productSearch')}>
                      <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className={cx('searchInput')}
                      />
                    </div>
                    
                    {/* Product list */}
                    <div className={cx('productList')}>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((prod) => {
                          const isSelected = formData.productIds.includes(prod.id);
                          return (
                            <label key={prod.id} className={cx('productCheckbox', { selected: isSelected })}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onToggleProduct(prod.id)}
                              />
                              <span>{prod.name}</span>
                            </label>
                          );
                        })
                      ) : (
                        <div className={cx('emptyState')}>
                          {productSearchTerm ? 'Không tìm thấy sản phẩm' : 'Không có sản phẩm'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={cx('formGroup')}>
            <label>Mô tả</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Mô tả chương trình"
            />
          </div>

          <div className={cx('modalFooter')}>
            <button type="button" className={cx('cancelBtn')} onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className={cx('submitBtn')}>
              {mode === 'edit' ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PromotionFormModal;

