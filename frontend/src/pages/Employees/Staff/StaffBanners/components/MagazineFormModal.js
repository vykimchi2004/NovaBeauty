import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faUpload } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../StaffBanners.module.scss';

const cx = classNames.bind(styles);

function MagazineFormModal({ open, mode, formData, formErrors, previewUrl, uploadingImage, onClose, onChange, onSubmit, onFileChange }) {
  if (!open) return null;

  const title = mode === 'edit' ? 'Sửa tạp chí' : 'Thêm tạp chí';

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
              placeholder="Nhập tiêu đề tạp chí"
            />
            {formErrors.title && <span className={cx('errorText')}>{formErrors.title}</span>}
          </div>

          <div className={cx('formGroup')}>
            <label>Danh mục *</label>
            <select
              value={formData.category || ''}
              onChange={(e) => onChange('category', e.target.value)}
              className={cx('selectInput')}
            >
              <option value="">-- Chọn danh mục --</option>
              <option value="Góc review">Góc review</option>
              <option value="Cách chăm sóc da">Cách chăm sóc da</option>
              <option value="Xu hướng trang điểm">Xu hướng trang điểm</option>
              <option value="Sự kiện">Sự kiện</option>
            </select>
            {formErrors.category && <span className={cx('errorText')}>{formErrors.category}</span>}
          </div>

          <div className={cx('formGroup', { error: formErrors.description })}>
            <label>Nội dung</label>
            <textarea
              value={formData.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder="Nhập nội dung tạp chí"
              rows="6"
            />
            {formErrors.description && <span className={cx('errorText')}>{formErrors.description}</span>}
          </div>

          <div className={cx('formGroup', { error: formErrors.imageUrl })}>
            <label>Hình ảnh *</label>
            <div className={cx('mediaUpload')}>
              <div className={cx('preview')}>
                {previewUrl || formData.imageUrl ? (
                  <>
                    <img src={previewUrl || formData.imageUrl} alt="magazine" />
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
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {formErrors.imageUrl && <span className={cx('errorText')}>{formErrors.imageUrl}</span>}
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

export default MagazineFormModal;
