import React from 'react';
import classNames from 'classnames/bind';
import styles from '../../StaffBanners/StaffBanners.module.scss';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const cx = classNames.bind(styles);

export default function MagazineFormModal({ open, formData, onChange, onClose, onSubmit }) {
  if (!open) return null;
  return (
    <div className={cx('modalOverlay')} onClick={onClose}>
      <div className={cx('modalContent')} onClick={(e) => e.stopPropagation()}>
        <div className={cx('modalHeader')}>
          <h3>Thêm Tạp chí</h3>
          <button onClick={onClose} className={cx('closeBtn')}><FontAwesomeIcon icon={faTimes} /></button>
        </div>
        <form className={cx('modalBody')} onSubmit={onSubmit}>
          <div className={cx('formGroup')}>
            <label>Tiêu đề *</label>
            <input value={formData.title || ''} onChange={(e) => onChange('title', e.target.value)} />
          </div>
          <div className={cx('formGroup')}>
            <label>Nội dung</label>
            <textarea rows={8} value={formData.content || ''} onChange={(e) => onChange('content', e.target.value)} />
          </div>
          <div className={cx('formGroup')}>
            <label>URL ảnh *</label>
            <input value={formData.imageUrl || ''} onChange={(e) => onChange('imageUrl', e.target.value)} />
          </div>
          <div className={cx('formActions')}>
            <button type="button" className={cx('cancelBtn')} onClick={onClose}>Hủy</button>
            <button type="submit" className={cx('submitBtn')}>Thêm</button>
          </div>
        </form>
      </div>
    </div>
  );
}
