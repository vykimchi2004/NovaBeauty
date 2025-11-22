import React, { useState, useEffect, useRef } from 'react';
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
  products,
  onClose,
  onChange,
  onSubmit,
  onFileChange,
  onToggleProduct,
}) {
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProductDropdownOpen(false);
      }
    };

    if (productDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [productDropdownOpen]);

  if (!open) return null;

  const title = mode === 'edit' ? 'Sửa banner' : 'Thêm banner';
  const hasImage = Boolean(previewUrl || formData.imageUrl);

  const selectedProducts = products.filter((p) => formData.productIds?.includes(p.id));
  const previewLabel =
    selectedProducts.length === 0
      ? 'Chọn sản phẩm...'
      : selectedProducts.length === 1
        ? selectedProducts[0].name
        : `Đã chọn ${selectedProducts.length} sản phẩm`;

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
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
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
                min={formData.startDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              />
              {formErrors.endDate && <span className={cx('errorText')}>{formErrors.endDate}</span>}
            </div>
          </div>

          <div className={cx('formGroup')}>
            <label>Danh sách sản phẩm</label>
            <div className={cx('dropdownSelect', { open: productDropdownOpen })} ref={dropdownRef}>
              <button
                type="button"
                className={cx('dropdownToggle')}
                onClick={() => setProductDropdownOpen(!productDropdownOpen)}
              >
                <span className={cx('dropdownLabel')}>{previewLabel}</span>
                <span className={cx('chevron', { open: productDropdownOpen })}>⌄</span>
              </button>
              {productDropdownOpen && (
                <div className={cx('dropdownMenu')}>
                  {products.length === 0 ? (
                    <span className={cx('helperText')}>Đang tải danh sách sản phẩm...</span>
                  ) : (
                    products.slice(0, 50).map((product) => (
                      <label key={product.id}>
                        <input
                          type="checkbox"
                          checked={formData.productIds?.includes(product.id) || false}
                          onChange={() => onToggleProduct(product.id)}
                        />
                        <span>{product.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
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

