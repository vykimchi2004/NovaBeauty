import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUpload } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../StaffBanners.module.scss';

const cx = classNames.bind(styles);

function BannerFormModal({
  open,
  mode,
  formData,
  formErrors,
  previewUrl,
  uploadingImage,
  categories,
  brandOptions,
  loadingCategories,
  onClose,
  onChange,
  onSubmit,
  onFileChange,
  onSelectCategory,
  onSelectBrand,
  onSelectTargetType,
}) {

  if (!open) return null;

  const title = mode === 'edit' ? 'Sửa banner' : 'Thêm banner';
  const hasImage = Boolean(previewUrl || formData.imageUrl);
  const selectedCategory = categories?.find((cat) => cat.id === formData.categoryId);
  const selectedBrand = formData.brand?.trim();
  const hasValidSelection =
    formData.targetType === 'all' ||
    (formData.targetType === 'category' && formData.categoryId) ||
    (formData.targetType === 'brand' && selectedBrand);

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
          <div className={cx('formGroup', { error: formErrors.title })}>
            <label>Tiêu đề *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Nhập tiêu đề banner"
            />
            {formErrors.title && <span className={cx('errorText')}>{formErrors.title}</span>}
          </div>

          <div className={cx('formGroup')}>
            <label>Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Nhập mô tả banner"
              rows="4"
            />
          </div>

          <div className={cx('formGroup', { error: formErrors.imageUrl })}>
            <label>Hình ảnh banner *</label>
            <div className={cx('mediaUpload')}>
              <div className={cx('preview')}>
                {hasImage ? (
                  <>
                    <img src={previewUrl || formData.imageUrl} alt="banner" />
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
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {formErrors.imageUrl && <span className={cx('errorText')}>{formErrors.imageUrl}</span>}
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
              {formErrors.startDate && (
                <span className={cx('errorText')}>{formErrors.startDate}</span>
              )}
            </div>

            <div className={cx('formGroup', { error: formErrors.endDate })}>
              <label>Ngày kết thúc *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => onChange('endDate', e.target.value)}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
              />
              {formErrors.endDate && <span className={cx('errorText')}>{formErrors.endDate}</span>}
            </div>
          </div>

          <div className={cx('formGroup', { error: formErrors.targetType })}>
            <label>Áp dụng theo *</label>
            <div className={cx('radioGroup')}>
              <label>
                <input
                  type="radio"
                  name="bannerTargetType"
                  value="all"
                  checked={formData.targetType === 'all'}
                  onChange={() => onSelectTargetType('all')}
                />
                Tất cả sản phẩm
              </label>
              <label>
                <input
                  type="radio"
                  name="bannerTargetType"
                  value="category"
                  checked={formData.targetType === 'category'}
                  onChange={() => onSelectTargetType('category')}
                />
                Danh mục
              </label>
              <label>
                <input
                  type="radio"
                  name="bannerTargetType"
                  value="brand"
                  checked={formData.targetType === 'brand'}
                  onChange={() => onSelectTargetType('brand')}
                />
                Thương hiệu
              </label>
            </div>
            {formErrors.targetType && (
              <span className={cx('errorText')}>{formErrors.targetType}</span>
            )}
          </div>

          {formData.targetType === 'category' && (
            <div className={cx('formGroup', { error: formErrors.categoryId })}>
              <label>Danh mục *</label>
              <select
                value={formData.categoryId}
                onChange={(e) => onSelectCategory(e.target.value)}
              >
                <option value="">
                  {loadingCategories ? 'Đang tải danh mục...' : 'Chọn danh mục'}
                </option>
                {(categories || []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {formErrors.categoryId && (
                <span className={cx('errorText')}>{formErrors.categoryId}</span>
                  )}
                </div>
          )}

          {formData.targetType === 'brand' && (
            <div className={cx('formGroup', { error: formErrors.brand })}>
              <label>Thương hiệu *</label>
              <select
                value={formData.brand}
                onChange={(e) => onSelectBrand(e.target.value)}
                disabled={(brandOptions || []).length === 0}
              >
                <option value="">
                  {(brandOptions || []).length === 0
                    ? 'Không có thương hiệu khả dụng'
                    : 'Chọn thương hiệu'}
                </option>
                {(brandOptions || []).map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
              {formErrors.brand && <span className={cx('errorText')}>{formErrors.brand}</span>}
            </div>
          )}

          <div className={cx('formGroup', { error: formErrors.productIds })}>
            <label>Sản phẩm áp dụng</label>
            <div className={cx('selectionSummary')}>
              {!formData.targetType ? (
                'Vui lòng chọn áp dụng theo danh mục, thương hiệu hoặc tất cả sản phẩm.'
              ) : !hasValidSelection ? (
                formData.targetType === 'category'
                  ? 'Chưa chọn danh mục áp dụng.'
                  : formData.targetType === 'brand'
                    ? 'Chưa chọn thương hiệu áp dụng.'
                    : 'Chưa chọn phạm vi áp dụng.'
              ) : formData.productIds?.length > 0 ? (
                <>
                  Banner sẽ áp dụng cho <strong>{formData.productIds.length}</strong> sản phẩm thuộc{' '}
                  <strong>
                    {formData.targetType === 'category'
                      ? selectedCategory?.name || 'danh mục đã chọn'
                      : formData.targetType === 'brand'
                        ? selectedBrand || 'thương hiệu đã chọn'
                        : 'tất cả sản phẩm'}
                  </strong>
                  .
                </>
              ) : (
                'Không tìm thấy sản phẩm nào phù hợp với lựa chọn này.'
              )}
            </div>
            {formErrors.productIds && (
              <span className={cx('errorText')}>{formErrors.productIds}</span>
            )}
          </div>

          <div className={cx('formActions')}>
            <button type="button" className={cx('cancelBtn')} onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className={cx('submitBtn')} disabled={uploadingImage}>
              {uploadingImage ? 'Đang upload...' : mode === 'edit' ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BannerFormModal;

