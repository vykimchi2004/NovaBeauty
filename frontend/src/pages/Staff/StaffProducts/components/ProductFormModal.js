import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../StaffProducts.module.scss';

const cx = classNames.bind(styles);

function ProductFormModal({
  open,
  title,
  submitLabel,
  formData,
  formErrors,
  categories,
  categoriesTree = [], // Tree structure: parent với children
  loadingCategories,
  uploadingMedia,
  maxMediaItems = 6,
  fileInputRef,
  onClose,
  onSubmit,
  onFormDataChange,
  mediaFiles = [],
  onMediaSelect,
  onRemoveMedia,
  onSetDefaultMedia,
  onAddColorCode,
  onRemoveColorCode,
}) {
  if (!open) return null;

  const renderError = (key) =>
    formErrors[key] ? <span className={cx('errorText')}>{formErrors[key]}</span> : null;

  return (
    <div className={cx('modalOverlay')} onClick={onClose}>
      <div className={cx('modalContent')} onClick={(e) => e.stopPropagation()}>
        <div className={cx('modalHeader')}>
          <h3>{title}</h3>
          <button className={cx('closeBtn')} type="button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <form onSubmit={onSubmit} className={cx('modalBody')}>
          <div className={cx('formGroup', { error: formErrors.productId })}>
            <label>Mã sản phẩm *</label>
            <input
              type="text"
              value={formData.productId}
              onChange={(e) => onFormDataChange('productId', e.target.value)}
              placeholder="VD: MP-001"
            />
            {renderError('productId')}
          </div>

          <div className={cx('formGroup', { error: formErrors.name })}>
            <label>Tên sản phẩm *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormDataChange('name', e.target.value)}
              placeholder="Nhập tên sản phẩm"
            />
            {renderError('name')}
          </div>

          <div className={cx('formGroup', { error: formErrors.categoryId })}>
            <label>Danh mục *</label>
            <select
              value={formData.categoryId}
              onChange={(e) => onFormDataChange('categoryId', e.target.value)}
            >
              <option value="">{loadingCategories ? 'Đang tải danh mục...' : 'Chọn danh mục'}</option>
              {categoriesTree.length === 0 && !loadingCategories && (
                <option value="" disabled>
                  Không có danh mục nào
                </option>
              )}
              {categoriesTree.map((parentCat) => (
                <React.Fragment key={parentCat.id}>
                  {/* Parent category - có thể chọn được */}
                  <option value={parentCat.id} className={cx('category-parent')}>
                    {parentCat.name}
                  </option>
                  {/* Subcategories với indent */}
                  {parentCat.children && parentCat.children.length > 0 && parentCat.children.map((subCat) => (
                    <option key={subCat.id} value={subCat.id} className={cx('category-child')}>
                      &nbsp;&nbsp;&nbsp;&nbsp;{subCat.name}
                    </option>
                  ))}
                </React.Fragment>
              ))}
              {/* Fallback: nếu không có tree, dùng flat list */}
              {categoriesTree.length === 0 && categories.length > 0 && categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {renderError('categoryId')}
          </div>

          <div className={cx('formRow')}>
            <div className={cx('formGroup', { error: formErrors.brand })}>
              <label>Thương hiệu</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => onFormDataChange('brand', e.target.value)}
                placeholder="Nhập thương hiệu"
              />
              {renderError('brand')}
            </div>

            <div className={cx('formGroup')}>
              <label>Xuất xứ thương hiệu</label>
              <input
                type="text"
                value={formData.brandOrigin}
                onChange={(e) => onFormDataChange('brandOrigin', e.target.value)}
                placeholder="Nhập xuất xứ thương hiệu"
              />
            </div>
          </div>

          <div className={cx('formRow')}>
            <div className={cx('formGroup', { error: formErrors.price })}>
              <label>Giá niêm yết (đồng) *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.price}
                onChange={(e) => {
                  const value = e.target.value;
                  // Chỉ cho phép số nguyên (không có dấu thập phân)
                  if (value === '' || /^\d+$/.test(value)) {
                    onFormDataChange('price', value);
                  }
                }}
                placeholder="VD: 100000 (một trăm nghìn đồng)"
              />
              {formData.price && (
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Giá đã nhập: {new Intl.NumberFormat('vi-VN').format(parseFloat(formData.price || 0))} ₫
                </small>
              )}
              {renderError('price')}
            </div>

            <div className={cx('formGroup')}>
              <label>Giá hiển thị (tự động tính)</label>
              <input
                type="text"
                readOnly
                value={
                  formData.price
                    ? new Intl.NumberFormat('vi-VN', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        Math.round(parseFloat(formData.price || 0) * 1.08)
                      ) + ' ₫'
                    : '0 ₫'
                }
                className={cx('readOnlyInput')}
              />
              <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Giá hiển thị = Giá niêm yết × 1.08 (Thuế cố định 8%)
              </small>
            </div>
          </div>

          <div className={cx('formGroup')}>
            <label>Kích thước/Quy cách</label>
            <input
              type="text"
              value={formData.size}
              onChange={(e) => onFormDataChange('size', e.target.value)}
              placeholder="VD: 30ml, Hũ 50g…"
            />
          </div>

          <div className={cx('formGroup', { error: formErrors.weight })}>
            <label>Trọng lượng (gram)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.weight}
              onChange={(e) => onFormDataChange('weight', e.target.value)}
              placeholder="Nhập trọng lượng"
            />
            {renderError('weight')}
          </div>
          
          <div className={cx('formGroup', { error: formErrors.mediaFiles })}>
            <label>Ảnh sản phẩm *</label>
            <div className={cx('mediaUploadRow')}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onMediaSelect}
                disabled={uploadingMedia || mediaFiles.length >= maxMediaItems}
                className={cx('mediaFileInput')}
              />
              <small>
                Bạn có thể tải tối đa {maxMediaItems} tệp. Ảnh đầu tiên sẽ được chọn làm ảnh chính, bạn có thể thay đổi sau khi tải lên.
              </small>
            </div>
            {uploadingMedia && <span className={cx('uploadingText')}>Đang tải ảnh...</span>}
            {renderError('mediaFiles')}

            {mediaFiles.length > 0 ? (
              <div className={cx('mediaPreviewGrid')}>
                {mediaFiles.map((media, index) => {
                  const source = media.preview || media.uploadedUrl;
                  return (
                    <div
                      key={media.id || source || index}
                      className={cx('mediaPreviewItem', { active: media.isDefault })}
                    >
                      {media.type === 'VIDEO' ? (
                        <video src={source} controls />
                      ) : (
                        <img src={source} alt={`Media ${index + 1}`} />
                      )}
                      <div className={cx('mediaPreviewActions')}>
                        <label className={cx('defaultToggle')}>
                          <input
                            type="radio"
                            name="defaultMedia"
                            checked={media.isDefault}
                            onChange={() => onSetDefaultMedia(index)}
                          />
                          Ảnh chính
                        </label>
                        <button
                          type="button"
                          className={cx('mediaActionBtn', 'danger')}
                          onClick={() => onRemoveMedia(index)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={cx('mediaPlaceholder')}>
                <span>Chưa có ảnh nào. Vui lòng tải ảnh sản phẩm.</span>
              </div>
            )}
          </div>

          <div className={cx('formGroup', { error: formErrors.description })}>
            <label>Mô tả</label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => onFormDataChange('description', e.target.value)}
              placeholder="Mô tả ngắn về sản phẩm"
            />
            {renderError('description')}
          </div>

          <div className={cx('formRow')}>
            <div className={cx('formGroup')}>
              <label>Kết cấu</label>
              <input
                type="text"
                value={formData.texture || ''}
                onChange={(e) => onFormDataChange('texture', e.target.value)}
                placeholder="VD: Dạng lỏng, Dạng kem, Dạng gel..."
              />
            </div>

            <div className={cx('formGroup')}>
              <label>Loại da</label>
              <input
                type="text"
                value={formData.skinType || ''}
                onChange={(e) => onFormDataChange('skinType', e.target.value)}
                placeholder="VD: Da dầu, Da khô, Da hỗn hợp, Mọi loại da..."
              />
            </div>
          </div>

          <div className={cx('formGroup')}>
            <label>Review (Ưu điểm)</label>
            <textarea
              rows="3"
              value={formData.reviewHighlights || ''}
              onChange={(e) => onFormDataChange('reviewHighlights', e.target.value)}
              placeholder="Nhập các ưu điểm nổi bật của sản phẩm"
            />
          </div>

          <div className={cx('formGroup')}>
            <label>Mã màu (nếu có)</label>
            <div className={cx('colorCodeInputWrapper')}>
              <input
                type="text"
                placeholder="Nhập mã màu (VD: #FF0000, Red, Đỏ...)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (onAddColorCode) {
                      onAddColorCode(e.target.value);
                      e.target.value = '';
                    }
                  }
                }}
                className={cx('colorCodeInput')}
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = e.target.previousElementSibling;
                  if (onAddColorCode && input.value) {
                    onAddColorCode(input.value);
                    input.value = '';
                  }
                }}
                className={cx('addColorCodeBtn')}
              >
                Thêm
              </button>
            </div>
            {formData.colorCodes && formData.colorCodes.length > 0 && (
              <div className={cx('colorCodesList')}>
                {formData.colorCodes.map((colorCode, index) => (
                  <button
                    key={index}
                    type="button"
                    className={cx('colorCodeButton')}
                    onClick={() => onRemoveColorCode && onRemoveColorCode(index)}
                  >
                    {colorCode}
                    <FontAwesomeIcon icon={faTimes} className={cx('removeIcon')} />
                  </button>
                ))}
              </div>
            )}
            <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Nhập mã màu và nhấn Enter hoặc nút "Thêm" để thêm. Click vào mã màu để xóa.
            </small>
          </div>

          <div className={cx('formRow')}>
            <div className={cx('formGroup', { error: formErrors.ingredients })}>
              <label>Thành phần</label>
              <textarea
                rows="3"
                value={formData.ingredients}
                onChange={(e) => onFormDataChange('ingredients', e.target.value)}
                placeholder="Danh sách thành phần"
              />
              {renderError('ingredients')}
            </div>

            <div className={cx('formGroup', { error: formErrors.uses })}>
              <label>Công dụng</label>
              <textarea
                rows="3"
                value={formData.uses}
                onChange={(e) => onFormDataChange('uses', e.target.value)}
                placeholder="Công dụng của sản phẩm"
              />
              {renderError('uses')}
            </div>
          </div>

          <div className={cx('formGroup')}>
            <label>Số lượng tồn kho</label>
            <input
              type="number"
              min="0"
              value={formData.stockQuantity}
              onChange={(e) => onFormDataChange('stockQuantity', e.target.value)}
              placeholder="Nhập số lượng hiện có (nếu cần)"
            />
            {renderError('stockQuantity')}
          </div>

          <div className={cx('formGroup', { error: formErrors.usageInstructions })}>
            <label>Cách sử dụng</label>
            <textarea
              rows="3"
              value={formData.usageInstructions}
              onChange={(e) => onFormDataChange('usageInstructions', e.target.value)}
              placeholder="Hướng dẫn sử dụng"
            />
            {renderError('usageInstructions')}
          </div>

          <div className={cx('modalFooter')}>
            <button type="button" className={cx('cancelBtn')} onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className={cx('submitBtn')}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductFormModal;

