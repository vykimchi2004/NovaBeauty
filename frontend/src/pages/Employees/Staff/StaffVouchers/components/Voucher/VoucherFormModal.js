import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUpload } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../../StaffVouchers.module.scss';

const cx = classNames.bind(styles);

function VoucherFormModal({
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
  // Hooks must be called before early return
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const toggleProductDropdown = () => setProductDropdownOpen((prev) => !prev);
  const previewLabel = useMemo(() => {
    if (formData.productIds?.length === 0) return 'Chọn sản phẩm';
    return `Đã chọn ${formData.productIds?.length || 0} sản phẩm`;
  }, [formData.productIds?.length]);

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products.slice(0, 50);
    const searchLower = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(searchLower)
    ).slice(0, 50);
  }, [products, productSearchTerm]);

  const selectedProducts = useMemo(() => {
    return products.filter(p => formData.productIds?.includes(p.id));
  }, [products, formData.productIds]);

  if (!open) return null;

  const title = mode === 'edit' ? 'Sửa voucher' : 'Thêm voucher';
  const hasImage = Boolean(previewUrl || formData.imageUrl);

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
              <label>Tên voucher *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="Nhập tên voucher"
              />
              {formErrors.name && <span className={cx('errorText')}>{formErrors.name}</span>}
            </div>
            <div className={cx('formGroup', { error: formErrors.code })}>
              <label>Mã voucher *</label>
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
                placeholder="VD: VOUCHER123"
                maxLength={50}
              />
              {formErrors.code && <span className={cx('errorText')}>{formErrors.code}</span>}
              <small className={cx('helperText')} style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Chỉ được nhập chữ hoa, số, dấu gạch ngang (-) và gạch dưới (_)
              </small>
            </div>
          </div>

          <div className={cx('formGroup')}>
            <label>Phạm vi áp dụng *</label>
            <div className={cx('scopeToggle')}>
              <button
                type="button"
                className={cx({ active: formData.applyScope === 'ORDER' && formData.orderValueType === 'ALL' })}
                onClick={() => onScopeChange('ORDER', 'ALL')}
              >
                Toàn sản phẩm
              </button>
              <button
                type="button"
                className={cx({ active: formData.applyScope === 'ORDER' && formData.orderValueType === 'MIN_ORDER' })}
                onClick={() => onScopeChange('ORDER', 'MIN_ORDER')}
              >
                Theo tổng giá trị đơn hàng
              </button>
              <button
                type="button"
                className={cx({ active: formData.applyScope === 'CATEGORY' })}
                onClick={() => onScopeChange('CATEGORY')}
              >
                Theo danh mục
              </button>
              <button
                type="button"
                className={cx({ active: formData.applyScope === 'PRODUCT' })}
                onClick={() => onScopeChange('PRODUCT')}
              >
                Theo sản phẩm cụ thể
              </button>
            </div>
            <small style={{ color: '#666', fontSize: '12px', marginTop: '8px', display: 'block' }}>
              {formData.applyScope === 'ORDER' && formData.orderValueType === 'ALL' && 'Áp dụng cho toàn bộ đơn hàng, không có điều kiện giá trị tối thiểu'}
              {formData.applyScope === 'ORDER' && formData.orderValueType === 'MIN_ORDER' && 'Áp dụng cho đơn hàng đạt giá trị tối thiểu (cần đặt đơn hàng tối thiểu bên dưới)'}
              {formData.applyScope === 'CATEGORY' && 'Áp dụng cho các sản phẩm thuộc danh mục được chọn'}
              {formData.applyScope === 'PRODUCT' && 'Áp dụng cho các sản phẩm cụ thể được chọn'}
            </small>
          </div>

          <div className={cx('formGroup', { error: formErrors.imageUrl })}>
            <label>Hình ảnh voucher *</label>
            <div className={cx('mediaUpload')}>
              <div className={cx('preview')}>
                {hasImage ? (
                  <>
                    <img src={previewUrl || formData.imageUrl} alt="voucher" />
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
                {uploadingImage ? 'Đang tải...' : hasImage ? 'Đổi ảnh' : 'Chọn ảnh'}
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

          <div className={cx('formGroup')}>
            <label>Loại giảm giá *</label>
            <div className={cx('scopeToggle')}>
              <button
                type="button"
                className={cx({ active: formData.discountValueType === 'PERCENTAGE' })}
                onClick={() => onChange('discountValueType', 'PERCENTAGE')}
              >
                Theo %
              </button>
              <button
                type="button"
                className={cx({ active: formData.discountValueType === 'AMOUNT' })}
                onClick={() => onChange('discountValueType', 'AMOUNT')}
              >
                Theo số tiền
              </button>
            </div>
          </div>

          <div className={cx('formRow')}>
            <div className={cx('formGroup', { error: formErrors.discountValue })}>
              <label>
                {formData.discountValueType === 'AMOUNT' ? 'Giảm giá (đồng) *' : 'Giảm giá (%) *'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                max={formData.discountValueType === 'PERCENTAGE' ? 100 : undefined}
                value={formData.discountValue}
                onChange={(e) => onChange('discountValue', e.target.value)}
                placeholder={
                  formData.discountValueType === 'AMOUNT'
                    ? 'Nhập số tiền giảm'
                    : 'Nhập phần trăm giảm giá'
                }
              />
              {formErrors.discountValue && <span className={cx('errorText')}>{formErrors.discountValue}</span>}
            </div>

            <div
              className={cx('formGroup', {
                error: formErrors.maxDiscountValue,
                disabledField: formData.discountValueType !== 'PERCENTAGE',
              })}
            >
              <label>
                Mức giảm tối đa
                {formData.discountValueType === 'PERCENTAGE' && ' *'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.maxDiscountValue}
                onChange={(e) => onChange('maxDiscountValue', e.target.value)}
                placeholder="Nhập số tiền tối đa"
                disabled={formData.discountValueType !== 'PERCENTAGE'}
              />
              {formErrors.maxDiscountValue && (
                <span className={cx('errorText')}>{formErrors.maxDiscountValue}</span>
              )}
            </div>
          </div>

          <div className={cx('formRow')}>
            <div className={cx('formGroup', { error: formErrors.startDate })}>
              <label>Ngày bắt đầu *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => onChange('startDate', e.target.value)}
              />
              {formErrors.startDate && <span className={cx('errorText')}>{formErrors.startDate}</span>}
            </div>
            <div className={cx('formGroup', { error: formErrors.expiryDate })}>
              <label>Ngày kết thúc *</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => onChange('expiryDate', e.target.value)}
              />
              {formErrors.expiryDate && <span className={cx('errorText')}>{formErrors.expiryDate}</span>}
            </div>
          </div>

          <div className={cx('formRow')}>
            <div className={cx('formGroup', { error: formErrors.usageLimit })}>
              <label>Giới hạn sử dụng *</label>
              <input
                type="number"
                min="1"
                value={formData.usageLimit}
                onChange={(e) => onChange('usageLimit', e.target.value)}
              />
              {formErrors.usageLimit && <span className={cx('errorText')}>{formErrors.usageLimit}</span>}
            </div>
            <div className={cx('formGroup', { error: formErrors.minOrderValue })}>
              <label>
                Đơn hàng tối thiểu
                {formData.applyScope === 'ORDER' && formData.orderValueType === 'MIN_ORDER' && ' *'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.minOrderValue}
                onChange={(e) => onChange('minOrderValue', e.target.value)}
                disabled={formData.applyScope === 'ORDER' && formData.orderValueType === 'ALL'}
              />
              {formErrors.minOrderValue && <span className={cx('errorText')}>{formErrors.minOrderValue}</span>}
            </div>
          </div>

          {formData.applyScope === 'CATEGORY' && (
            <div className={cx('formGroup', { error: formErrors.categoryIds })}>
              <label>Danh mục áp dụng *</label>
              <div className={cx('categoryGrid')}>
                {categories.slice(0, 30).map((cat) => {
                  const active = formData.categoryIds?.includes(cat.id);
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
              {formErrors.categoryIds && <span className={cx('errorText')}>{formErrors.categoryIds}</span>}
            </div>
          )}

          {formData.applyScope === 'PRODUCT' && (
            <div className={cx('formGroup', { error: formErrors.productIds })}>
              <label>Sản phẩm áp dụng *</label>
              
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
                          const isSelected = formData.productIds?.includes(prod.id);
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
              {formErrors.productIds && <span className={cx('errorText')}>{formErrors.productIds}</span>}
            </div>
          )}

          <div className={cx('formGroup')}>
            <label>Mô tả</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Mô tả chi tiết voucher"
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

export default VoucherFormModal;

