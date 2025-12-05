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
  const [phoneError, setPhoneError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderCode, setSelectedOrderCode] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setOrdersLoading(true);
        const user = storage.get(STORAGE_KEYS.USER, null);
        if (!user?.email) {
          setOrders([]);
          return;
        }

        // Tạm thời dùng getAllOrders, khi backend bổ sung API đơn hàng theo khách thì chỉ cần sửa tại đây
        const all = await orderService.getAllOrders();
        const list = Array.isArray(all)
          ? all.filter((o) => (o.email || '').toLowerCase() === user.email.toLowerCase())
          : [];

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
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setPhoneError('');
    
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
    if (!phoneRegex.test(phoneNumber)) {
      setPhoneError('Hãy nhập số điện thoại bắt đầu từ 0 và đủ 10 số');
      return;
    }
    
    if (!name || !email || !message) {
      notify.error('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }

    if (isOtherOrder && !topic) {
      notify.error('Vui lòng nhập chủ đề khiếu nại khi không chọn đơn hàng.');
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
          <label htmlFor="support-name">Họ và tên</label>
            <input id="support-name" name="name" required placeholder="Nhập họ và tên của bạn" />
        </div>
        <div className={cx('fieldGrid')}>
          <div className={cx('field')}>
            <label htmlFor="support-email">Email</label>
            <input id="support-email" name="email" type="email" required placeholder="novabeauty@example.com" />
          </div>
          <div className={cx('field')}>
            <label htmlFor="support-phone">Số điện thoại</label>
            <input
              id="support-phone"
              name="phone"
              type="tel"
              required
              placeholder="Nhập SĐT (bắt đầu bằng 0, 10 số)"
              maxLength={10}
              onChange={(e) => {
                // Chỉ cho phép nhập số
                const value = e.target.value.replace(/[^0-9]/g, '');
                // Giới hạn 10 ký tự
                const limitedValue = value.slice(0, 10);
                e.target.value = limitedValue;
                if (phoneError) setPhoneError('');
              }}
              onKeyPress={(e) => {
                // Chỉ cho phép nhập số
                if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                  e.preventDefault();
                }
              }}
            />
            {phoneError && <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>{phoneError}</div>}
          </div>
        </div>
        <div className={cx('fieldGrid')}>
          <div className={cx('field')}>
            <label htmlFor="support-order">Mã đơn hàng (nếu có)</label>
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
                onChange={(e) => setSelectedOrderCode(e.target.value)}
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
          </div>
          {selectedOrderCode === '__other__' && (
            <div className={cx('field')}>
              <label htmlFor="support-topic">Chủ đề</label>
              <input
                id="support-topic"
                name="topic"
                placeholder="Nhập chủ đề khiếu nại (ví dụ: Thái độ phục vụ, tư vấn sai sản phẩm...)"
              />
            </div>
          )}
        </div>
        <div className={cx('field')}>
          <label htmlFor="support-message">Nội dung chi tiết</label>
            <textarea
            id="support-message"
            name="message"
            rows={5}
            required
            placeholder="Mô tả vấn đề bạn gặp phải..."
          />
        </div>
        <button type="submit" className={cx('submitButton')} disabled={submitting}>
          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
      </form>
    </div>
  );
}

export default SupportRequestSection;

