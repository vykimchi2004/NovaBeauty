import React from 'react';
import ReactDOM from 'react-dom/client';
import NotificationModal from '~/components/Common/NotificationModal/NotificationModal';

// Tạo một container để render modal
let notificationContainer = null;

const createContainer = () => {
  if (!notificationContainer) {
    const div = document.createElement('div');
    div.id = 'notification-container';
    document.body.appendChild(div);
    notificationContainer = ReactDOM.createRoot(div);
  }
  return notificationContainer;
};

const showNotification = ({ type, title, message, onConfirm, onClose, confirmText, cancelText, showCancel }) => {
  return new Promise((resolve) => {
    const container = createContainer();
    
    const handleClose = () => {
      container.render(<div />);
      if (onClose) onClose();
      resolve(false);
    };

    const handleConfirm = () => {
      container.render(<div />);
      if (onConfirm) onConfirm();
      resolve(true);
    };

    container.render(
      <NotificationModal
        isOpen={true}
        type={type}
        title={title}
        message={message}
        onClose={handleClose}
        onConfirm={handleConfirm}
        confirmText={confirmText}
        cancelText={cancelText}
        showCancel={showCancel}
      />
    );
  });
};

// Helper functions
export const notify = {
  success: (message, title = 'Thành công') => {
    return showNotification({
      type: 'success',
      title,
      message,
      showCancel: false,
      confirmText: 'Đóng'
    });
  },

  error: (message, title = 'Lỗi') => {
    return showNotification({
      type: 'error',
      title,
      message,
      showCancel: false,
      confirmText: 'Đóng'
    });
  },

  warning: (message, title = 'Cảnh báo') => {
    return showNotification({
      type: 'warning',
      title,
      message,
      showCancel: false,
      confirmText: 'Đóng'
    });
  },

  info: (message, title = 'Thông tin') => {
    return showNotification({
      type: 'info',
      title,
      message,
      showCancel: false,
      confirmText: 'Đóng'
    });
  },

  confirm: (message, title = 'Xác nhận', confirmText = 'Xác nhận', cancelText = 'Hủy') => {
    return showNotification({
      type: 'confirm',
      title,
      message,
      showCancel: true,
      confirmText,
      cancelText
    });
  }
};

export default notify;


