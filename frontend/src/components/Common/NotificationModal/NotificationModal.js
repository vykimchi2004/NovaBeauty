import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './NotificationModal.module.scss';

const cx = classNames.bind(styles);

function NotificationModal({ 
  isOpen, 
  type = 'info', // 'success', 'error', 'warning', 'info', 'confirm'
  title, 
  message, 
  onClose, 
  onConfirm,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  showCancel = true
}) {
  if (!isOpen) return null;

  const icons = {
    success: faCheckCircle,
    error: faExclamationCircle,
    warning: faExclamationCircle,
    info: faInfoCircle,
    confirm: faInfoCircle
  };

  const icon = icons[type] || faInfoCircle;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className={cx('overlay')} onClick={handleCancel}>
      <div className={cx('modal', type)} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeBtn')} onClick={handleCancel}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
        
        <div className={cx('iconWrapper', type)}>
          <FontAwesomeIcon icon={icon} className={cx('icon')} />
        </div>

        {title && <h3 className={cx('title')}>{title}</h3>}
        <p className={cx('message')}>{message}</p>

        <div className={cx('actions')}>
          {type === 'confirm' && showCancel && (
            <button className={cx('btn', 'btnCancel')} onClick={handleCancel}>
              {cancelText}
            </button>
          )}
          <button className={cx('btn', 'btnConfirm', type)} onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationModal;


