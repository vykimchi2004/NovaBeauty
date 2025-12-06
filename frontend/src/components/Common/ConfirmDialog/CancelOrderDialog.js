import { createPortal } from 'react-dom';
import classNames from 'classnames/bind';
import styles from './CancelOrderDialog.module.scss';

const cx = classNames.bind(styles);

function CancelOrderDialog({
    open,
    title = 'Hủy đơn hàng',
    message = 'Bạn có chắc chắn muốn hủy đơn hàng này?',
    confirmText = 'Hủy đơn',
    cancelText = 'Đóng',
    loading = false,
    defaultReason = '',
    onConfirm,
    onCancel,
}) {
    if (!open || typeof document === 'undefined') return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (loading) return;
        const formData = new FormData(e.currentTarget);
        const reason = (formData.get('reason') || '').toString().trim();
        onConfirm?.(reason);
    };

    return createPortal(
        <div className={cx('overlay')} onClick={loading ? undefined : onCancel}>
            <div className={cx('dialog')} onClick={(e) => e.stopPropagation()}>
                <div className={cx('header')}>
                    <h3 className={cx('title')}>{title}</h3>
                    <button
                        className={cx('close-btn')}
                        onClick={onCancel}
                        aria-label="Đóng"
                        disabled={loading}
                    >
                        ×
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={cx('body')}>
                        <p className={cx('message')}>{message}</p>
                        <label className={cx('label')} htmlFor="cancel-reason">
                            Lý do hủy đơn (không bắt buộc)
                        </label>
                        <textarea
                            id="cancel-reason"
                            name="reason"
                            className={cx('textarea')}
                            placeholder="Ví dụ: Đổi ý, đặt nhầm địa chỉ, tìm được nơi khác..."
                            defaultValue={defaultReason}
                            rows={2}
                            disabled={loading}
                        />
                    </div>
                    <div className={cx('footer')}>
                        <button
                            type="button"
                            className={cx('btn', 'cancel')}
                            onClick={onCancel}
                            disabled={loading}
                        >
                            {cancelText}
                        </button>
                        <button
                            type="submit"
                            className={cx('btn', 'confirm')}
                            disabled={loading}
                        >
                            {loading ? 'Đang hủy...' : confirmText}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
}

export default CancelOrderDialog;
