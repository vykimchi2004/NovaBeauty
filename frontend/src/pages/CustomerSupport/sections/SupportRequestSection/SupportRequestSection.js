import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './SupportRequestSection.module.scss';
import notify from '~/utils/notification';
import ticketService from '~/services/ticket';
import orderService from '~/services/order';
import { STORAGE_KEYS } from '~/services/config';
import { storage } from '~/services/utils';

const cx = classNames.bind(styles);

function SupportRequestSection() {
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderCode, setSelectedOrderCode] = useState('');
  
  // Lấy thông tin user để tự động điền
  const [userInfo, setUserInfo] = useState({ name: '', email: '', phone: '' });
  
  // Lỗi validation cho từng trường
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    orderCode: '',
    topic: '',
    message: '',
  });

  useEffect(() => {
    // Lấy thông tin user từ storage để tự động điền form
    const user = storage.get(STORAGE_KEYS.USER, null);
    if (user) {
      setUserInfo({
        name: user.fullName || user.name || '',
        email: user.email || '',
        phone: user.phoneNumber || user.phone || '',
      });
    }

    const fetchOrders = async () => {
      try {
        setOrdersLoading(true);
        if (!user?.email) {
          setOrders([]);
          return;
        }

        // Dùng getMyOrders để lấy đơn hàng của khách hàng hiện tại
        const myOrders = await orderService.getMyOrders();
        const list = Array.isArray(myOrders) ? myOrders : [];
        setOrders(list);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading orders for complaint form:', err);
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, []);
  
  // Clear lỗi khi người dùng nhập
  const clearError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const form = event.target;
    const name = form.elements['name']?.value?.trim() || '';
    const email = form.elements['email']?.value?.trim() || '';
    const phoneRaw = form.elements['phone']?.value || '';
    const rawOrderCode = form.elements['orderCode']?.value || '';
    const isOtherOrder = rawOrderCode === '__other__';
    // Giống NovaBeauty: khi chọn "Khác", gửi 'KHAC' thay vì null/empty để backend validate @NotBlank
    const orderCode = isOtherOrder ? 'KHAC' : (rawOrderCode || '').trim();
    const topic = isOtherOrder ? (form.elements['topic']?.value?.trim() || '') : '';
    const message = form.elements['message']?.value?.trim() || '';

    // Validate số điện thoại
    const phoneNumber = phoneRaw.trim().replace(/[^0-9]/g, '');
    const phoneRegex = /^0[0-9]{9}$/;
    
    // Reset tất cả lỗi và validate từng trường
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      orderCode: '',
      topic: '',
      message: '',
    };
    
    let hasError = false;
    
    if (!name) {
      newErrors.name = 'Vui lòng nhập họ và tên';
      hasError = true;
    }
    
    if (!email) {
      newErrors.email = 'Vui lòng nhập email';
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
      hasError = true;
    }
    
    if (!phoneNumber) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
      hasError = true;
    } else if (!phoneRegex.test(phoneNumber)) {
      newErrors.phone = 'Số điện thoại phải bắt đầu từ 0 và đủ 10 số';
      hasError = true;
    }
    
    if (!rawOrderCode) {
      newErrors.orderCode = 'Vui lòng chọn mã đơn hàng';
      hasError = true;
    }
    
    if (isOtherOrder && !topic) {
      newErrors.topic = 'Vui lòng nhập chủ đề khiếu nại';
      hasError = true;
    }
    
    if (!message) {
      newErrors.message = 'Vui lòng nhập nội dung chi tiết';
      hasError = true;
    }
    
    setErrors(newErrors);
    
    if (hasError) {
      return;
    }

    try {
      setSubmitting(true);
      await ticketService.createTicket({
        customerName: name,
        email,
        phone: phoneNumber,
        orderCode,
        topic,
        content: message,
      });
      notify.success('Cảm ơn bạn! Khiếu nại / yêu cầu hỗ trợ đã được ghi nhận.');
      form.reset();
      setSelectedOrderCode('');
      setErrors({ name: '', email: '', phone: '', orderCode: '', topic: '', message: '' });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error submitting support request:', err);
      notify.error('Không thể gửi khiếu nại. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cx('wrapper')}>
      <p className={cx('intro')}>
        Chúng tôi luôn mong muốn mang lại trải nghiệm tốt nhất. Vui lòng điền thông tin chi tiết để đội ngũ CSKH hỗ trợ
        bạn trong vòng 24 giờ làm việc.
      </p>
      <form className={cx('form')} onSubmit={handleSubmit}>
        <div className={cx('field')}>
          <label htmlFor="support-name">Họ và tên <span style={{ color: 'red' }}>*</span></label>
            <input 
              id="support-name" 
              name="name" 
              placeholder="Nhập họ và tên của bạn"
              defaultValue={userInfo.name}
              onChange={() => clearError('name')}
              className={cx({ error: errors.name })}
            />
            {errors.name && <div className={cx('errorText')}>{errors.name}</div>}
        </div>
        <div className={cx('fieldGrid')}>
          <div className={cx('field')}>
            <label htmlFor="support-email">Email <span style={{ color: 'red' }}>*</span></label>
            <input 
              id="support-email" 
              name="email" 
              type="email" 
              placeholder="novabeauty@example.com"
              defaultValue={userInfo.email}
              readOnly={!!userInfo.email}
              onChange={() => clearError('email')}
              className={cx({ error: errors.email })}
              style={userInfo.email ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
            />
            {errors.email && <div className={cx('errorText')}>{errors.email}</div>}
          </div>
          <div className={cx('field')}>
            <label htmlFor="support-phone">Số điện thoại <span style={{ color: 'red' }}>*</span></label>
            <input
              id="support-phone"
              name="phone"
              type="tel"
              placeholder="Nhập SĐT (bắt đầu bằng 0, 10 số)"
              maxLength={10}
              defaultValue={userInfo.phone}
              className={cx({ error: errors.phone })}
              onChange={(e) => {
                // Chỉ cho phép nhập số
                const value = e.target.value.replace(/[^0-9]/g, '');
                // Giới hạn 10 ký tự
                const limitedValue = value.slice(0, 10);
                e.target.value = limitedValue;
                clearError('phone');
              }}
              onKeyPress={(e) => {
                // Chỉ cho phép nhập số
                if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                  e.preventDefault();
                }
              }}
            />
            {errors.phone && <div className={cx('errorText')}>{errors.phone}</div>}
          </div>
        </div>
        <div className={cx('fieldGrid')}>
          <div className={cx('field')}>
            <label htmlFor="support-order">Mã đơn hàng <span style={{ color: 'red' }}>*</span></label>
            {ordersLoading ? (
              <input
                id="support-order"
                name="orderCode"
                placeholder="Đang tải danh sách đơn hàng..."
                disabled
              />
            ) : (
              <select
                id="support-order"
                name="orderCode"
                value={selectedOrderCode}
                onChange={(e) => {
                  setSelectedOrderCode(e.target.value);
                  clearError('orderCode');
                }}
                className={cx({ error: errors.orderCode })}
              >
                <option value="">Chọn mã đơn hàng</option>
                {orders &&
                  orders.length > 0 &&
                  orders.map((order) => (
                    <option key={order.id} value={order.orderCode || order.code || order.id}>
                      {order.orderCode || order.code || order.id}
                    </option>
                  ))}
                <option value="__other__">Khác (không có đơn hàng)</option>
              </select>
            )}
            {errors.orderCode && <div className={cx('errorText')}>{errors.orderCode}</div>}
          </div>
          {selectedOrderCode === '__other__' && (
            <div className={cx('field')}>
              <label htmlFor="support-topic">Chủ đề <span style={{ color: 'red' }}>*</span></label>
              <input
                id="support-topic"
                name="topic"
                placeholder="Nhập chủ đề khiếu nại (ví dụ: Thái độ phục vụ, tư vấn sai sản phẩm...)"
                onChange={() => clearError('topic')}
                className={cx({ error: errors.topic })}
              />
              {errors.topic && <div className={cx('errorText')}>{errors.topic}</div>}
            </div>
          )}
        </div>
        <div className={cx('field')}>
          <label htmlFor="support-message">Nội dung chi tiết <span style={{ color: 'red' }}>*</span></label>
            <textarea
            id="support-message"
            name="message"
            rows={5}
            placeholder="Mô tả vấn đề bạn gặp phải..."
            onChange={() => clearError('message')}
            className={cx({ error: errors.message })}
          />
          {errors.message && <div className={cx('errorText')}>{errors.message}</div>}
        </div>
        <button type="submit" className={cx('submitButton')} disabled={submitting}>
          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
      </form>
    </div>
  );
}

export default SupportRequestSection;

