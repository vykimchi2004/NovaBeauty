import NotificationModal from '../NotificationModal/NotificationModal';

function ConfirmDialog({
    open,
    title = 'Xác nhận',
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    onConfirm,
    onCancel,
}) {
    return (
        <NotificationModal
            isOpen={!!open}
            type="confirm"
            title={title}
            message={message}
            confirmText={confirmText}
            cancelText={cancelText}
            showCancel
            onConfirm={onConfirm}
            onClose={onCancel}
        />
    );
}

export default ConfirmDialog;


