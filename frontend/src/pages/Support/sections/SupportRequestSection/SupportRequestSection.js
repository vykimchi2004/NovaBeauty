import classNames from 'classnames/bind';
import styles from './SupportRequestSection.module.scss';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

function SupportRequestSection() {
  const handleSubmit = (event) => {
    event.preventDefault();
    // TODO: integrate API submission
    notify.success('Cảm ơn bạn! Chúng tôi sẽ liên hệ trong thời gian sớm nhất.');
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
            <input id="support-phone" name="phone" required placeholder="0123 456 789" />
          </div>
        </div>
        <div className={cx('fieldGrid')}>
          <div className={cx('field')}>
            <label htmlFor="support-order">Mã đơn hàng (nếu có)</label>
            <input id="support-order" name="orderCode" placeholder="VD: NB123456" />
          </div>
          <div className={cx('field')}>
            <label htmlFor="support-topic">Chủ đề</label>
            <select id="support-topic" name="topic" defaultValue="">
              <option value="" disabled>
                Chọn chủ đề
              </option>
              <option value="delivery">Vấn đề giao hàng</option>
              <option value="payment">Thanh toán & hoàn tiền</option>
              <option value="product">Chất lượng sản phẩm</option>
              <option value="other">Khác</option>
            </select>
          </div>
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
        <button type="submit" className={cx('submitButton')}>
          Gửi yêu cầu
        </button>
      </form>
    </div>
  );
}

export default SupportRequestSection;

