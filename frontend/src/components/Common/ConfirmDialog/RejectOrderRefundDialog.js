import NotificationModal from '../NotificationModal/NotificationModal';

function RejectOrderRefundDialog({ open, onConfirm, onCancel, loading }) {
    return (
        <NotificationModal
            isOpen={!!open}
            type="confirm"
            title="Từ chối yêu cầu hoàn tiền?"
            message="Hành động này sẽ thông báo tới khách hàng rằng yêu cầu hoàn tiền bị từ chối."
            confirmText={loading ? 'Đang xử lý...' : 'Từ chối'}
            cancelText="Hủy"
            showCancel
            onConfirm={loading ? undefined : onConfirm}
            onClose={onCancel}
        />
    );
}

export default RejectOrderRefundDialog;


