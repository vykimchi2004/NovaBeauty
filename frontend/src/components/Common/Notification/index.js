import { useCallback } from 'react';
import { notify } from '../../../utils/notification';

export const useNotification = () => {
    const success = useCallback((message = 'Thao tác thành công', title = 'Thành công') => {
        notify.success(message, title);
    }, []);

    const error = useCallback((message = 'Đã xảy ra lỗi', title = 'Lỗi') => {
        notify.error(message, title);
    }, []);

    const info = useCallback((message, title = 'Thông báo') => {
        notify.info(message, title);
    }, []);

    const warning = useCallback((message, title = 'Cảnh báo') => {
        notify.warning(message, title);
    }, []);

    const notifyFn = useCallback((type = 'info', message, title) => {
        const map = {
            success,
            error,
            info,
            warning,
        };
        const handler = map[type] || info;
        handler(message, title);
    }, [success, error, info, warning]);

    return {
        success,
        error,
        info,
        warning,
        notify: notifyFn,
    };
};

export { default as Notification } from './Notification';


